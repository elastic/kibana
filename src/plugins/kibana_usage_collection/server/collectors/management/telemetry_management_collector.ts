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

import { IUiSettingsClient } from 'kibana/server';
import { UsageCollectionSetup } from 'src/plugins/usage_collection/server';
import { includes } from 'lodash';
import { stackManagementSchema } from './schema';
import { WhitelistedSettings, BlacklistedSettings } from './settings_list';

export type UsageStats = WhitelistedSettings | BlacklistedSettings;

const whitelistedSettings: Array<keyof WhitelistedSettings> = [
  'visualize:enableLabs',
  'visualization:heatmap:maxBuckets',
  'visualization:colorMapping',
  'visualization:regionmap:showWarnings',
  'visualization:dimmingOpacity',
  'visualization:tileMap:maxPrecision',
  'securitySolution:ipReputationLinks',
  'csv:separator',
  'visualization:tileMap:WMSdefaults',
  'timelion:target_buckets',
  'timelion:max_buckets',
  'timelion:es.timefield',
  'timelion:min_interval',
  'timelion:default_rows',
  'timelion:default_columns',
  'timelion:es.default_index',
  'timelion:showTutorial',
  'securitySolution:timeDefaults',
  'securitySolution:defaultAnomalyScore',
  'securitySolution:refreshIntervalDefaults',
  'securitySolution:enableNewsFeed',
  'search:includeFrozen',
  'courier:maxConcurrentShardRequests',
  'courier:batchSearches',
  'courier:setRequestPreference',
  'courier:customRequestPreference',
  'courier:ignoreFilterIfFieldNotInIndex',
  'rollups:enableIndexPatterns',
  'notifications:lifetime:warning',
  'notifications:lifetime:banner',
  'notifications:lifetime:info',
  'notifications:lifetime:error',
  'doc_table:highlight',
  'discover:searchOnPageLoad',
  'doc_table:hideTimeColumn',
  'discover:sampleSize',
  'defaultColumns',
  'context:defaultSize',
  'discover:aggs:terms:size',
  'context:tieBreakerFields',
  'discover:sort:defaultOrder',
  'context:step',
  'accessibility:disableAnimations',
  'ml:fileDataVisualizerMaxFileSize',
  'ml:anomalyDetection:results:enableTimeDefaults',
  'ml:anomalyDetection:results:timeDefaults',
  'truncate:maxHeight',
  'timepicker:timeDefaults',
  'timepicker:refreshIntervalDefaults',
  'timepicker:quickRanges',
  'theme:version',
  'theme:darkMode',
  'state:storeInSessionStorage',
  'savedObjects:perPage',
  'search:queryLanguage',
  'shortDots:enable',
  'sort:options',
  'savedObjects:listingLimit',
  'query:queryString:options',
  'pageNavigation',
  'metrics:max_buckets',
  'query:allowLeadingWildcards',
  'metaFields',
  'indexPattern:placeholder',
  'histogram:barTarget',
  'histogram:maxBars',
  'format:number:defaultLocale',
  'format:percent:defaultPattern',
  'format:number:defaultPattern',
  'history:limit',
  'format:defaultTypeMap',
  'format:currency:defaultPattern',
  'defaultIndex',
  'format:bytes:defaultPattern',
  'filters:pinnedByDefault',
  'filterEditor:suggestValues',
  'fields:popularLimit',
  'dateNanosFormat',
  'defaultRoute',
  'dateFormat:tz',
  'dateFormat:scaled',
  'csv:quoteValues',
  'dateFormat:dow',
  'dateFormat',
];

export function createCollectorFetch(getUiSettingsClient: () => IUiSettingsClient | undefined) {
  return async function fetchUsageStats(): Promise<UsageStats | undefined> {
    const uiSettingsClient = getUiSettingsClient();
    if (!uiSettingsClient) {
      return;
    }

    const userProvided = await uiSettingsClient.getUserProvided();
    const modifiedEntries = Object.entries(userProvided)
      .filter(([key]) => key !== 'buildNum')
      .reduce((obj: any, [key, { userValue }]) => {
        const isWhitelisted = includes(whitelistedSettings, key);
        obj[key] = isWhitelisted ? userValue : true;
        return obj;
      }, {});

    return modifiedEntries;
  };
}

export function registerManagementUsageCollector(
  usageCollection: UsageCollectionSetup,
  getUiSettingsClient: () => IUiSettingsClient | undefined
) {
  const collector = usageCollection.makeUsageCollector<UsageStats | undefined>({
    type: 'stack_management',
    isReady: () => typeof getUiSettingsClient() !== 'undefined',
    fetch: createCollectorFetch(getUiSettingsClient),
    schema: stackManagementSchema,
  });

  usageCollection.registerCollector(collector);
}
