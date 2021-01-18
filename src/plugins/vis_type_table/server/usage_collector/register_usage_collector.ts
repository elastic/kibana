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

import { Observable } from 'rxjs';
import { first } from 'rxjs/operators';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';

import { getStats, VisTypeTableUsage } from './get_stats';

export function registerVisTypeTableUsageCollector(
  collectorSet: UsageCollectionSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  const collector = collectorSet.makeUsageCollector<VisTypeTableUsage | undefined>({
    type: 'vis_type_table',
    isReady: () => true,
    schema: {
      total: { type: 'long' },
      total_split: { type: 'long' },
      split_columns: {
        total: { type: 'long' },
        enabled: { type: 'long' },
      },
      split_rows: {
        total: { type: 'long' },
        enabled: { type: 'long' },
      },
    },
    fetch: async ({ esClient }) => {
      const index = (await config.pipe(first()).toPromise()).kibana.index;
      return await getStats(esClient, index);
    },
  });
  collectorSet.registerCollector(collector);
}
