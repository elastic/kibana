/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { AggregationsCardinalityAggregate } from '@elastic/elasticsearch/lib/api/types';
import {
  Connector,
  ConnectorConfigProperties,
  ConnectorStats,
  ConnectorSyncJob,
  CRAWLER_SERVICE_TYPE,
  DataSourceSpecificStats,
  DocumentsStats,
  fetchConnectors,
  fetchSyncJobs,
  SyncJobStats,
  SyncJobStatsByState,
  SyncJobStatsByType,
  SyncJobStatsDetails,
  SyncJobType,
  SyncStatus,
  TriggerMethod,
} from '..';

export const collectConnectorStats = async (
  client: ElasticsearchClient
): Promise<ConnectorStats[]> => {
  const connectors = await fetchConnectors(client);
  const syncJobs: ConnectorSyncJob[] = [];

  let hasMore: boolean | undefined;
  let from = 0;
  do {
    const result = await fetchSyncJobs(client, undefined, from);
    syncJobs.push(...result.data);
    hasMore = result._meta.page.has_more_hits_than_total;
    from += result._meta.page.size;
  } while (hasMore);

  const connectorStatsArray: ConnectorStats[] = [];
  const syncJobsMap = groupSyncJobsByConnector(syncJobs);
  for (const connector of connectors) {
    // skip crawlers
    if (connector.service_type === CRAWLER_SERVICE_TYPE) {
      continue;
    }
    const connectorStats: ConnectorStats = {
      id: connector.id,
      serviceType: connector.service_type,
      isNative: connector.is_native,
      isDeleted: false,
      status: connector.status,
      indexName: connector.index_name,
      dlsEnabled: !!connector.configuration.use_document_level_security?.value,
      sslEnabled: connector.configuration.ssl_enabled
        ? !!(connector.configuration.ssl_enabled as ConnectorConfigProperties).value
        : false,
      fetchSelectively: fetchSelectively(connector),
      textExtractionServiceEnabled: !!connector.configuration.use_text_extraction_service?.value,
      documents: await documentsStats(client, connector),
      dataSourceSpecific: await dataSourceSpecificStats(client, connector),
      scheduling: {
        accessControl: connector.scheduling.access_control,
        full: connector.scheduling.full,
        incremental: connector.scheduling.incremental,
      },
    };

    if (connector.pipeline) {
      connectorStats.ingestPipeline = {
        name: connector.pipeline.name,
        extractBinaryContent: connector.pipeline.extract_binary_content,
        reduceWhitespace: connector.pipeline.reduce_whitespace,
        runMLInference: connector.pipeline.run_ml_inference,
      };
    }

    if (connector.filtering.length > 0) {
      const filtering = connector.filtering[0];
      connectorStats.syncRules = {
        active: {
          withBasicRules:
            Array.isArray(filtering?.active?.rules) && filtering.active.rules.length > 1,
          withAdvancedRules:
            !!filtering?.active?.advanced_snippet?.value &&
            Object.keys(filtering.active.advanced_snippet.value).length > 0,
        },
        draft: {
          withBasicRules:
            Array.isArray(filtering?.draft?.rules) && filtering.draft.rules.length > 1,
          withAdvancedRules:
            !!filtering?.draft?.advanced_snippet?.value &&
            Object.keys(filtering.draft.advanced_snippet.value).length > 0,
        },
      };
    }

    if (syncJobsMap.has(connector.id)) {
      // @ts-ignore
      connectorStats.syncJobs = syncJobsStats(syncJobsMap.get(connector.id));
      syncJobsMap.delete(connector.id);
    }
    connectorStatsArray.push(connectorStats);
  }

  // process orphaned sync jobs
  for (const [connectorId, orphanedSyncJobs] of syncJobsMap) {
    const connectorStats: ConnectorStats = {
      id: connectorId,
      isDeleted: true,
      serviceType: orphanedSyncJobs[0].connector.service_type,
      syncJobs: syncJobsStats(orphanedSyncJobs),
    };
    connectorStatsArray.push(connectorStats);
  }

  return connectorStatsArray;
};

function groupSyncJobsByConnector(syncJobs: ConnectorSyncJob[]): Map<string, ConnectorSyncJob[]> {
  const syncJobMaps: Map<string, ConnectorSyncJob[]> = new Map<string, ConnectorSyncJob[]>();
  for (const syncJob of syncJobs) {
    // filter out sync jobs for crawler
    if (syncJob.connector.service_type === CRAWLER_SERVICE_TYPE) {
      continue;
    }
    const connectorId = syncJob.connector.id ? syncJob.connector.id : 'undefined';
    if (!syncJobMaps.has(connectorId)) {
      syncJobMaps.set(connectorId, []);
    }
    // @ts-ignore
    syncJobMaps.get(connectorId).push(syncJob);
  }
  return syncJobMaps;
}

function fetchSelectively(connector: Connector): boolean {
  const rcfMap: Record<string, string> = {
    azure_blob_storage: 'containers',
    confluence: 'spaces',
    github: 'repositories',
    jira: 'projects',
    mssql: 'tables',
    mysql: 'tables',
    oracle: 'tables',
    postgresql: 'tables',
    s3: 'buckets',
    servicenow: 'services',
    sharepoint_online: 'site_collections',
    sharepoint_server: 'site_collections',
  };

  if (!connector.service_type || !(connector.service_type in rcfMap)) {
    return false;
  }

  const rcfField = rcfMap[connector.service_type];
  if (!(rcfField in connector.configuration)) {
    return false;
  }

  return !(
    (connector.configuration[rcfField] as ConnectorConfigProperties).value as string
  ).includes('*');
}

const documentsStats = async (
  client: ElasticsearchClient,
  connector: Connector
): Promise<DocumentsStats> => {
  const stats: DocumentsStats = {
    total: 0,
    volume: 0,
    inLastSync: connector.last_indexed_document_count ? connector.last_indexed_document_count : 0,
  };
  if (!connector.index_name) {
    return stats;
  }
  try {
    const indicesStatsResponse = await client.indices.stats({ index: connector.index_name });
    stats.total = indicesStatsResponse._all.primaries?.docs?.count ?? 0;
    stats.volume = indicesStatsResponse._all.primaries?.store?.size_in_bytes ?? 0;
  } catch (e) {
    /* empty */
  }

  return stats;
};

const dataSourceSpecificStats = async (
  client: ElasticsearchClient,
  connector: Connector
): Promise<DataSourceSpecificStats> => {
  const stats: DataSourceSpecificStats = {};
  switch (connector.service_type) {
    case 'confluence':
      stats.confluence = {
        dataSourceType: (connector.configuration.data_source as ConnectorConfigProperties)
          ?.value as string,
      };
      break;
    case 'github':
      stats.github = {
        isCloud:
          (connector.configuration.data_source as ConnectorConfigProperties)?.value ===
          'github_cloud',
      };
      break;
    case 'jira':
      stats.jira = {
        dataSourceType: (connector.configuration.data_source as ConnectorConfigProperties)
          ?.value as string,
      };
      break;
    case 'mongodb':
      stats.mongodb = {
        directConnect: !!(connector.configuration.direct_connection as ConnectorConfigProperties)
          ?.value,
      };
      break;
    case 'mssql':
      stats.mssql = {
        validateHost: !!(connector.configuration.validate_host as ConnectorConfigProperties)?.value,
        tables: connector.index_name ? await tableCounts(client, connector.index_name, 'table') : 0,
      };
      break;
    case 'mysql':
      stats.mysql = {
        tables: connector.index_name ? await tableCounts(client, connector.index_name, 'Table') : 0,
      };
      break;
    case 'oracle':
      stats.oracle = {
        tables: connector.index_name ? await tableCounts(client, connector.index_name, 'Table') : 0,
      };
      break;
    case 'postgresql':
      stats.postgresql = {
        tables: connector.index_name ? await tableCounts(client, connector.index_name, 'table') : 0,
      };
      break;
    case 'slack':
      stats.slack = {
        autoJoinChannelsEnabled: !!(
          connector.configuration.auto_join_channels as ConnectorConfigProperties
        )?.value,
        syncUsersEnabled: !!(connector.configuration.sync_users as ConnectorConfigProperties)
          ?.value,
        fetchLastNDays: (connector.configuration.fetch_last_n_days as ConnectorConfigProperties)
          ?.value as number,
      };
      break;
    case 'zoom':
      stats.zoom = {
        recordingAge: (connector.configuration.recording_age as ConnectorConfigProperties)
          ?.value as number,
      };
      break;
  }
  return stats;
};

const tableCounts = async (
  client: ElasticsearchClient,
  indexName: string,
  tableField: string
): Promise<number> => {
  try {
    const aggs = {
      table_count: {
        cardinality: {
          field: `${tableField}.keyword`,
        },
      },
    };

    const searchResponse = await client.search({ index: indexName, aggs, size: 0 });

    return (
      (searchResponse.aggregations?.table_count as AggregationsCardinalityAggregate).value ?? 0
    );
  } catch (e) {
    return 0;
  }
};

function syncJobsStats(syncJobs: ConnectorSyncJob[]): SyncJobStats {
  const stats: SyncJobStats = {
    overall: syncJobsStatsDetails(syncJobs),
  };

  const syncJobsWithTextExtractionServiceEnabled = syncJobs.filter(
    (syncJob) => !!syncJob.connector.configuration.use_text_extraction_service?.value
  );
  if (syncJobsWithTextExtractionServiceEnabled.length > 0) {
    stats.withTextExtractionServiceEnabled = syncJobsStatsDetails(
      syncJobsWithTextExtractionServiceEnabled
    );
  }

  return stats;
}

function syncJobsStatsDetails(syncJobs: ConnectorSyncJob[]): SyncJobStatsDetails {
  const stats: SyncJobStatsDetails = {
    total: syncJobs.length,
  };
  const last30DaysSyncJobs = recentSyncJobs(30, syncJobs);
  if (last30DaysSyncJobs.length > 0) {
    stats.last30Days = syncJobsStatsByType(last30DaysSyncJobs);
  }
  const last7DaysSyncJobs = recentSyncJobs(7, syncJobs);
  if (last7DaysSyncJobs.length > 0) {
    stats.last7Days = syncJobsStatsByType(last7DaysSyncJobs);
  }
  return stats;
}

function recentSyncJobs(days: number, syncJobs: ConnectorSyncJob[]): ConnectorSyncJob[] {
  const today = new Date();
  const nDaysAgo = new Date(today.setDate(today.getDate() - days));
  return syncJobs.filter((syncJob) => {
    const createdAt = new Date(syncJob.created_at);
    return !isNaN(createdAt.getDate()) && createdAt > nDaysAgo;
  });
}

function syncJobsStatsByType(syncJobs: ConnectorSyncJob[]): SyncJobStatsByType {
  const stats: SyncJobStatsByType = {
    overall: syncJobsStatsByState(syncJobs),
  };
  const fullSyncJobs = syncJobs.filter((syncJob) => syncJob.job_type === SyncJobType.FULL);
  if (fullSyncJobs.length > 0) {
    stats.full = syncJobsStatsByState(fullSyncJobs);
  }
  const incrementalSyncJobs = syncJobs.filter(
    (syncJob) => syncJob.job_type === SyncJobType.INCREMENTAL
  );
  if (incrementalSyncJobs.length > 0) {
    stats.incremental = syncJobsStatsByState(incrementalSyncJobs);
  }
  const accessControlSyncJobs = syncJobs.filter(
    (syncJob) => syncJob.job_type === SyncJobType.ACCESS_CONTROL
  );
  if (accessControlSyncJobs.length > 0) {
    stats.accessControl = syncJobsStatsByState(accessControlSyncJobs);
  }
  return stats;
}

function syncJobsStatsByState(syncJobs: ConnectorSyncJob[]): SyncJobStatsByState {
  let manual = 0;
  let scheduled = 0;
  let completed = 0;
  let errored = 0;
  let canceled = 0;
  let suspended = 0;
  let idle = 0;
  let running = 0;
  let duration = 0;
  const errors = new Map<string, number>();
  let topErrors: string[] = [];

  for (const syncJob of syncJobs) {
    completed += syncJob.status === SyncStatus.COMPLETED ? 1 : 0;
    errored += syncJob.status === SyncStatus.ERROR ? 1 : 0;
    canceled += syncJob.status === SyncStatus.CANCELED ? 1 : 0;
    suspended += syncJob.status === SyncStatus.SUSPENDED ? 1 : 0;
    running += syncJob.status === SyncStatus.IN_PROGRESS ? 1 : 0;
    manual += syncJob.trigger_method === TriggerMethod.ON_DEMAND ? 1 : 0;
    scheduled += syncJob.trigger_method === TriggerMethod.SCHEDULED ? 1 : 0;

    if (syncJob.status in [SyncStatus.IN_PROGRESS, SyncStatus.CANCELING] && syncJob.last_seen) {
      const lastSeen = new Date(syncJob.last_seen);
      // A sync job with last_seen not updated for more than 5 mins is considered idle
      if (!isNaN(lastSeen.getTime()) && new Date().getTime() - lastSeen.getTime() > 5 * 60 * 1000) {
        idle += 1;
      }
    }
    if (syncJob.started_at && syncJob.completed_at) {
      const startedAt = new Date(syncJob.started_at);
      const completedAt = new Date(syncJob.completed_at);
      if (!isNaN(startedAt.getTime()) && !isNaN(completedAt.getTime())) {
        duration += Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);
      }
    }
    if (syncJob.status === SyncStatus.ERROR && syncJob.error) {
      errors.set(syncJob.error, (errors.get(syncJob.error) ?? 0) + 1);
    }
  }

  if (errors.size <= 5) {
    topErrors = [...errors.keys()];
  } else {
    topErrors = [...errors.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((a) => a[0])
      .slice(0, 5);
  }

  return {
    total: syncJobs.length,
    manual,
    scheduled,
    completed,
    errored,
    canceled,
    suspended,
    idle,
    running,
    totalDurationSeconds: duration,
    topErrors,
  } as SyncJobStatsByState;
}
