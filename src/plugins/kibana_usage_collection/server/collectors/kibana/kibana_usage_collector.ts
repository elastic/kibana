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
import { take } from 'rxjs/operators';
import { SharedGlobalConfig } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { KIBANA_STATS_TYPE } from '../../../common/constants';
import { getSavedObjectsCounts } from './get_saved_object_counts';

export function getKibanaUsageCollector(
  usageCollection: UsageCollectionSetup,
  legacyConfig$: Observable<SharedGlobalConfig>
) {
  return usageCollection.makeUsageCollector({
    type: 'kibana',
    isReady: () => true,
    async fetch(callCluster) {
      const {
        kibana: { index },
      } = await legacyConfig$.pipe(take(1)).toPromise();
      return {
        index,
        ...(await getSavedObjectsCounts(callCluster, index)),
      };
    },

    /*
     * Format the response data into a model for internal upload
     * 1. Make this data part of the "kibana_stats" type
     * 2. Organize the payload in the usage namespace of the data payload (usage.index, etc)
     */
    formatForBulkUpload: (result) => {
      return {
        type: KIBANA_STATS_TYPE,
        payload: {
          usage: result,
        },
      };
    },
  });
}

export function registerKibanaUsageCollector(
  usageCollection: UsageCollectionSetup,
  legacyConfig$: Observable<SharedGlobalConfig>
) {
  usageCollection.registerCollector(getKibanaUsageCollector(usageCollection, legacyConfig$));
}
