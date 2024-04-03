/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';

import { CONNECTORS_INDEX, CURRENT_CONNECTORS_JOB_INDEX } from '..';
import {
  ConnectorConfiguration,
  ConnectorDocument,
  SyncJobType,
  SyncStatus,
  TriggerMethod,
} from '../types/connectors';
import { isConfigEntry } from '../utils/is_category_entry';

export const startConnectorSync = async (
  client: ElasticsearchClient,
  {
    connectorId,
    jobType,
    targetIndexName,
  }: {
    connectorId: string;
    jobType?: SyncJobType;
    targetIndexName?: string;
  }
) => {
  const connectorResult = await client.get<ConnectorDocument>({
    id: connectorId,
    index: CONNECTORS_INDEX,
  });
  const connector = connectorResult._source;
  if (connector) {
    const configuration = Object.entries(connector.configuration).reduce(
      (acc, [key, configEntry]) => {
        if (isConfigEntry(configEntry)) {
          acc[key] = configEntry;
        }
        return acc;
      },
      {} as ConnectorConfiguration
    );
    const {
      filtering,
      index_name: connectorIndexName,
      language,
      pipeline,
      service_type: serviceType,
    } = connector;

    const now = new Date().toISOString();

    return await client.index({
      document: {
        cancelation_requested_at: null,
        canceled_at: null,
        completed_at: null,
        connector: {
          configuration,
          filtering: filtering ? filtering[0]?.active ?? null : null,
          id: connectorId,
          index_name: targetIndexName || connectorIndexName,
          language,
          pipeline: pipeline ?? null,
          service_type: serviceType,
        },
        created_at: now,
        deleted_document_count: 0,
        error: null,
        indexed_document_count: 0,
        indexed_document_volume: 0,
        job_type: jobType || SyncJobType.FULL,
        last_seen: null,
        metadata: {},
        started_at: null,
        status: SyncStatus.PENDING,
        total_document_count: null,
        trigger_method: TriggerMethod.ON_DEMAND,
        worker_hostname: null,
      },
      index: CURRENT_CONNECTORS_JOB_INDEX,
    });
  } else {
    throw new Error('resource_not_found');
  }
};
