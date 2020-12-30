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

import { MakeSchemaFrom } from 'src/plugins/usage_collection/server';
import { UsageStats } from './telemetry_management_collector';

// Retrieved by changing all the current settings in Kibana (we'll need to revisit it in the future).
// I would suggest we use flattened type for the mappings of this collector.
export const stackManagementSchema: MakeSchemaFrom<UsageStats> = {
  'visualize:enableLabs': { type: 'boolean' },
  'visualization:heatmap:maxBuckets': { type: 'long' },
  'visualization:colorMapping': { type: 'text' },
  'visualization:regionmap:showWarnings': { type: 'boolean' },
  'visualization:dimmingOpacity': { type: 'float' },
  'visualization:tileMap:maxPrecision': { type: 'long' },
  'securitySolution:ipReputationLinks': { type: 'text' },
  'csv:separator': { type: 'keyword' },
  'visualization:tileMap:WMSdefaults': { type: 'text' },
  'timelion:target_buckets': { type: 'long' },
  'timelion:max_buckets': { type: 'long' },
  'timelion:es.timefield': { type: 'keyword' },
  'timelion:min_interval': { type: 'keyword' },
  'timelion:default_rows': { type: 'long' },
  'timelion:default_columns': { type: 'long' },
  'timelion:quandl.key': { type: 'keyword' },
  'timelion:es.default_index': { type: 'keyword' },
  'timelion:showTutorial': { type: 'boolean' },
  'securitySolution:timeDefaults': { type: 'keyword' },
  'securitySolution:defaultAnomalyScore': { type: 'long' },
  'securitySolution:defaultIndex': { type: 'keyword' }, // it's an array
  'securitySolution:refreshIntervalDefaults': { type: 'keyword' },
  'securitySolution:newsFeedUrl': { type: 'keyword' },
  'securitySolution:enableNewsFeed': { type: 'boolean' },
  'search:includeFrozen': { type: 'boolean' },
  'courier:maxConcurrentShardRequests': { type: 'long' },
  'courier:batchSearches': { type: 'boolean' },
  'courier:setRequestPreference': { type: 'keyword' },
  'courier:customRequestPreference': { type: 'keyword' },
  'courier:ignoreFilterIfFieldNotInIndex': { type: 'boolean' },
  'rollups:enableIndexPatterns': { type: 'boolean' },
  'xpackReporting:customPdfLogo': { type: 'text' },
  'notifications:lifetime:warning': { type: 'long' },
  'notifications:lifetime:banner': { type: 'long' },
  'notifications:lifetime:info': { type: 'long' },
  'notifications:banner': { type: 'text' },
  'notifications:lifetime:error': { type: 'long' },
  'doc_table:highlight': { type: 'boolean' },
  'discover:searchOnPageLoad': { type: 'boolean' },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'doc_table:hideTimeColumn': { type: 'boolean' },
  'discover:sampleSize': { type: 'long' },
  defaultColumns: { type: 'keyword' }, // it's an array
  'context:defaultSize': { type: 'long' },
  'discover:aggs:terms:size': { type: 'long' },
  'context:tieBreakerFields': { type: 'keyword' }, // it's an array
  'discover:sort:defaultOrder': { type: 'keyword' },
  'context:step': { type: 'long' },
  'accessibility:disableAnimations': { type: 'boolean' },
  'ml:fileDataVisualizerMaxFileSize': { type: 'keyword' },
  'ml:anomalyDetection:results:enableTimeDefaults': { type: 'boolean' },
  'ml:anomalyDetection:results:timeDefaults': { type: 'keyword' },
  'truncate:maxHeight': { type: 'long' },
  'timepicker:timeDefaults': { type: 'keyword' },
  'timepicker:refreshIntervalDefaults': { type: 'keyword' },
  'timepicker:quickRanges': { type: 'keyword' },
  'theme:version': { type: 'keyword' },
  'theme:darkMode': { type: 'boolean' },
  'state:storeInSessionStorage': { type: 'boolean' },
  'savedObjects:perPage': { type: 'long' },
  'search:queryLanguage': { type: 'keyword' },
  'shortDots:enable': { type: 'boolean' },
  'sort:options': { type: 'keyword' },
  'savedObjects:listingLimit': { type: 'long' },
  'query:queryString:options': { type: 'keyword' },
  pageNavigation: { type: 'keyword' },
  'metrics:max_buckets': { type: 'long' },
  'query:allowLeadingWildcards': { type: 'boolean' },
  metaFields: { type: 'keyword' }, // it's an array
  'indexPattern:placeholder': { type: 'keyword' },
  'histogram:barTarget': { type: 'long' },
  'histogram:maxBars': { type: 'long' },
  'format:number:defaultLocale': { type: 'keyword' },
  'format:percent:defaultPattern': { type: 'keyword' },
  'format:number:defaultPattern': { type: 'keyword' },
  'history:limit': { type: 'long' },
  'format:defaultTypeMap': { type: 'keyword' },
  'format:currency:defaultPattern': { type: 'keyword' },
  defaultIndex: { type: 'keyword' },
  'format:bytes:defaultPattern': { type: 'keyword' },
  'filters:pinnedByDefault': { type: 'boolean' },
  'filterEditor:suggestValues': { type: 'boolean' },
  'fields:popularLimit': { type: 'long' },
  dateNanosFormat: { type: 'keyword' },
  defaultRoute: { type: 'keyword' },
  'dateFormat:tz': { type: 'keyword' },
  'dateFormat:scaled': { type: 'keyword' },
  'csv:quoteValues': { type: 'boolean' },
  'dateFormat:dow': { type: 'keyword' },
  dateFormat: { type: 'keyword' },
};
