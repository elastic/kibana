/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { get, snakeCase } from 'lodash';
const KIBANA_USAGE_TYPE = 'kibana';

const TYPES = [
  'dashboard',
  'visualization',
  'search',
  'index-pattern',
  'graph-workspace',
  'timelion-sheet',
];

/**
 * Fetches saved object client counts by querying the saved object index
 */
export function getKibanaUsageCollector(server) {
  const { collectorSet } = server.usage;
  return collectorSet.makeUsageCollector({
    type: KIBANA_USAGE_TYPE,
    async fetch(callCluster) {
      const index = server.config().get('kibana.index');
      const savedObjectCountSearchParams = {
        index,
        ignoreUnavailable: true,
        filterPath: 'aggregations.types.buckets',
        body: {
          size: 0,
          query: {
            terms: { type: TYPES },
          },
          aggs: {
            types: {
              terms: { field: 'type', size: TYPES.length }
            }
          }
        }
      };

      const resp = await callCluster('search', savedObjectCountSearchParams);
      const buckets = get(resp, 'aggregations.types.buckets', []);

      // get the doc_count from each bucket
      const bucketCounts = buckets.reduce((acc, bucket) => ({
        ...acc,
        [bucket.key]: bucket.doc_count,
      }), {});

      return {
        index,
        ...TYPES.reduce((acc, type) => ({ // combine the bucketCounts and 0s for types that don't have documents
          ...acc,
          [snakeCase(type)]: {
            total: bucketCounts[type] || 0
          }
        }), {})
      };
    }
  });
}
