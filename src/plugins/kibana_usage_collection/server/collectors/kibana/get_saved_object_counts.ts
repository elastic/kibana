/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * Moved from /x-pack/plugins/monitoring/server/kibana_monitoring/collectors/get_kibana_usage_collector.ts
 *
 * The PR https://github.com/elastic/kibana/pull/62665 proved what the issue https://github.com/elastic/kibana/issues/58249
 * was claiming: the structure and payload for common telemetry bits differs between Monitoring and OSS/X-Pack collections.
 *
 * Unifying this logic from Monitoring that makes sense to have in OSS here and we will import it on the monitoring side to reuse it.
 */

import { snakeCase } from 'lodash';
import { ElasticsearchClient } from 'src/core/server';

const TYPES = [
  'dashboard',
  'visualization',
  'search',
  'index-pattern',
  'graph-workspace',
  'timelion-sheet',
];

export interface KibanaSavedObjectCounts {
  dashboard: { total: number };
  visualization: { total: number };
  search: { total: number };
  index_pattern: { total: number };
  graph_workspace: { total: number };
  timelion_sheet: { total: number };
}

export async function getSavedObjectsCounts(
  esClient: ElasticsearchClient,
  kibanaIndex: string // Typically '.kibana'. We might need a way to obtain it from the SavedObjects client (or the SavedObjects client to provide a way to run aggregations?)
): Promise<KibanaSavedObjectCounts> {
  const savedObjectCountSearchParams = {
    index: kibanaIndex,
    ignoreUnavailable: true,
    filterPath: 'aggregations.types.buckets',
    body: {
      size: 0,
      query: {
        terms: { type: TYPES },
      },
      aggs: {
        types: {
          terms: { field: 'type', size: TYPES.length },
        },
      },
    },
  };
  const { body } = await esClient.search(savedObjectCountSearchParams);
  const buckets: Array<{ key: string; doc_count: number }> =
    body.aggregations?.types?.buckets || [];

  // Initialise the object with all zeros for all the types
  const allZeros: KibanaSavedObjectCounts = TYPES.reduce(
    (acc, type) => ({ ...acc, [snakeCase(type)]: { total: 0 } }),
    {} as KibanaSavedObjectCounts
  );

  // Add the doc_count from each bucket
  return buckets.reduce(
    (acc, { key, doc_count: total }) => (total ? { ...acc, [snakeCase(key)]: { total } } : acc),
    allZeros
  );
}
