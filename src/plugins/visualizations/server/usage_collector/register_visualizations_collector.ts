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

import { getStats, VisualizationUsage } from './get_usage_collector';

export function registerVisualizationsCollector(
  collectorSet: UsageCollectionSetup,
  config: Observable<{ kibana: { index: string } }>
) {
  const collector = collectorSet.makeUsageCollector<VisualizationUsage | undefined>({
    type: 'visualization_types',
    isReady: () => true,
    schema: {
      DYNAMIC_KEY: {
        total: { type: 'long' },
        spaces_min: { type: 'long' },
        spaces_max: { type: 'long' },
        spaces_avg: { type: 'long' },
        saved_7_days_total: { type: 'long' },
        saved_30_days_total: { type: 'long' },
        saved_90_days_total: { type: 'long' },
      },
    },
    fetch: async ({ esClient }) => {
      const index = (await config.pipe(first()).toPromise()).kibana.index;
      return await getStats(esClient, index);
    },
  });
  collectorSet.registerCollector(collector);
}
