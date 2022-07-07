/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
import { ElasticsearchClient } from '@kbn/core/server';

/**
 * @private
 * Lisf of all the active SO Types in Kibana.
 *
 * @remarks There is a Jest Integration Test to make sure devs keep this list up-to-date whenever they create/remove their SO types.
 */
export const BUILT_IN_SO_TYPES = [
  'action',
  'action_task_params',
  'alert',
  'api_key_pending_invalidation',
  'apm-indices',
  'apm-server-schema',
  'apm-service-group',
  'apm-telemetry',
  'app_search_telemetry',
  'application_usage_daily',
  'application_usage_totals',
  'canvas-element',
  'canvas-workpad',
  'canvas-workpad-template',
  'cases',
  'cases-comments',
  'cases-configure',
  'cases-connector-mappings',
  'cases-telemetry',
  'cases-user-actions',
  'config',
  'connector_token',
  'core-usage-stats',
  'csp-rule-template',
  'csp_rule',
  'dashboard',
  'endpoint:user-artifact',
  'endpoint:user-artifact-manifest',
  'enterprise_search_telemetry',
  'epm-packages',
  'epm-packages-assets',
  'event_loop_delays_daily',
  'exception-list',
  'exception-list-agnostic',
  'file-upload-usage-collection-telemetry',
  'fleet-preconfiguration-deletion-record',
  'graph-workspace',
  'index-pattern',
  'infrastructure-monitoring-log-view',
  'infrastructure-ui-source',
  'ingest-agent-policies',
  'ingest-download-sources',
  'ingest-outputs',
  'ingest-package-policies',
  'ingest_manager_settings',
  'inventory-view',
  'kql-telemetry',
  'legacy-url-alias',
  'lens',
  'lens-ui-telemetry',
  'map',
  'maps-telemetry',
  'metrics-explorer-view',
  'ml-job',
  'ml-module',
  'ml-trained-model',
  'monitoring-telemetry',
  'osquery-manager-usage-metric',
  'osquery-pack',
  'osquery-pack-asset',
  'osquery-saved-query',
  'query',
  'sample-data-telemetry',
  'search',
  'search-session',
  'search-telemetry',
  'security-rule',
  'security-solution-signals-migration',
  'siem-detection-engine-rule-actions',
  'siem-detection-engine-rule-execution-info',
  'siem-ui-timeline',
  'siem-ui-timeline-note',
  'siem-ui-timeline-pinned-event',
  'space',
  'spaces-usage-stats',
  'tag',
  'task',
  'telemetry',
  'ui-metric',
  'upgrade-assistant-ml-upgrade-operation',
  'upgrade-assistant-reindex-operation',
  'upgrade-assistant-telemetry',
  'uptime-dynamic-settings',
  'url',
  'usage-counters',
  'visualization',
  'workplace_search_telemetry',
];

/**
 * Object describing the output of {@link getSavedObjectsCounts} method.
 */
export interface SavedObjectsCounts {
  /**
   * Total number of Saved Objects
   */
  total: number;
  /**
   * Number of documents per Saved Objects for the top-N terms
   */
  per_type: Array<{ key: string; doc_count: number }>;
  /**
   * Number of documents outside the top-N terms
   */
  others: number;
}

/**
 * Returns the total number of Saved Objects indexed in Elasticsearch.
 * It also returns a break down of the document count for all the built-in SOs in Kibana (or the types specified in `onlyTypes`).
 * Finally, it completes the information with an `others` counter, that indicates the number of documents that do not match the SO type breakdown.
 *
 * @param esClient The {@link ElasticsearchClient} to use when performing the aggregation.
 * @param kibanaIndex The index where SOs are stored. Typically '.kibana'.
 * @param onlyTypes If provided, the results will only include the specified SO types.
 * @returns {@link SavedObjectsCounts}
 *
 * @remarks
 * To make sure that the terms aggregation (that behaves like a Top-N aggregation) does not return non-built-in SOs in Kibana,
 * we specify in `should` the terms we are interested in to bump their score.
 * Then, we sort the Top-N aggregation by the score of the documents instead of the default doc_count.
 */
export async function getSavedObjectsCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string, // Typically '.kibana'. We might need a way to obtain it from the SavedObjects client (or the SavedObjects client to provide a way to run aggregations?)
  onlyTypes?: string[]
): Promise<SavedObjectsCounts> {
  // If we are interested only is specific types, query for them. Otherwise, match all.
  const query = onlyTypes ? { terms: { type: onlyTypes } } : { match_all: {} };
  // Limit the number of terms to return in the bucket.
  const typesToShowInBreakdown = onlyTypes || BUILT_IN_SO_TYPES;
  const size = typesToShowInBreakdown.length;

  const savedObjectCountSearchParams = {
    index: kibanaIndex,
    ignore_unavailable: true,
    filter_path: [
      'aggregations.types.buckets',
      'aggregations.types.sum_other_doc_count',
      'hits.total',
    ],
    body: {
      size: 0,
      track_total_hits: true,
      query: {
        bool: {
          must: [query],
          // When there's a must, should is used to score higher (not as an additional filter). We need to list here all the built-in types
          should: [{ terms: { type: onlyTypes || BUILT_IN_SO_TYPES } }],
        },
      },
      aggs: {
        types: {
          terms: { field: 'type', size, order: { max_score: 'desc' } },
          // We cannot reach to the _score in the terms aggregations and need this extra aggs to bring it up.
          aggs: { max_score: { max: { script: '_score' } } },
        },
      },
    },
  };

  const body = await esClient.search<void, { types: estypes.AggregationsStringTermsAggregate }>(
    savedObjectCountSearchParams
  );

  const buckets =
    (body.aggregations?.types?.buckets as estypes.AggregationsStringTermsBucketKeys[]) || [];

  // If any of the built-in types does not have any documents, we may receive other SO types that we want to count in the `others` bucket for PII reasons.
  const { others, perTypeBreakdown } = buckets.reduce(
    (acc, perTypeEntry) => {
      if (typesToShowInBreakdown.includes(perTypeEntry.key)) {
        acc.perTypeBreakdown.push({ key: perTypeEntry.key, doc_count: perTypeEntry.doc_count });
      } else {
        acc.others += perTypeEntry.doc_count;
      }
      return acc;
    },
    {
      perTypeBreakdown: [] as Array<{ key: string; doc_count: number }>,
      others: body.aggregations?.types?.sum_other_doc_count ?? 0,
    }
  );

  return {
    total: (typeof body.hits?.total === 'number' ? body.hits?.total : body.hits?.total?.value) ?? 0,
    others,
    per_type: perTypeBreakdown,
  };
}
