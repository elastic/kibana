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

export interface BlacklistedSettings extends Record<string, boolean> {
  'timelion:quandl.key': boolean;
  'securitySolution:defaultIndex': boolean;
  'securitySolution:newsFeedUrl': boolean;
  'xpackReporting:customPdfLogo': boolean;
  'notifications:banner': boolean;
}

export interface WhitelistedSettings {
  'visualize:enableLabs': boolean;
  'visualization:heatmap:maxBuckets': number;
  'visualization:colorMapping': string;
  'visualization:regionmap:showWarnings': boolean;
  'visualization:dimmingOpacity': number;
  'visualization:tileMap:maxPrecision': number;
  'securitySolution:ipReputationLinks': string;
  'csv:separator': string;
  'visualization:tileMap:WMSdefaults': string;
  'timelion:target_buckets': number;
  'timelion:max_buckets': number;
  'timelion:es.timefield': string;
  'timelion:min_interval': string;
  'timelion:default_rows': number;
  'timelion:default_columns': number;
  'timelion:es.default_index': string;
  'timelion:showTutorial': boolean;
  'securitySolution:timeDefaults': string;
  'securitySolution:defaultAnomalyScore': number;
  'securitySolution:refreshIntervalDefaults': string;
  'securitySolution:enableNewsFeed': boolean;
  'search:includeFrozen': boolean;
  'courier:maxConcurrentShardRequests': number;
  'courier:batchSearches': boolean;
  'courier:setRequestPreference': string;
  'courier:customRequestPreference': string;
  'courier:ignoreFilterIfFieldNotInIndex': boolean;
  'rollups:enableIndexPatterns': boolean;
  'notifications:lifetime:warning': number;
  'notifications:lifetime:banner': number;
  'notifications:lifetime:info': number;
  'notifications:lifetime:error': number;
  'doc_table:highlight': boolean;
  'discover:searchOnPageLoad': boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  'doc_table:hideTimeColumn': boolean;
  'discover:sampleSize': number;
  defaultColumns: string[];
  'context:defaultSize': number;
  'discover:aggs:terms:size': number;
  'context:tieBreakerFields': string[];
  'discover:sort:defaultOrder': string;
  'context:step': number;
  'accessibility:disableAnimations': boolean;
  'ml:fileDataVisualizerMaxFileSize': string;
  'ml:anomalyDetection:results:enableTimeDefaults': boolean;
  'ml:anomalyDetection:results:timeDefaults': string;
  'truncate:maxHeight': number;
  'timepicker:timeDefaults': string;
  'timepicker:refreshIntervalDefaults': string;
  'timepicker:quickRanges': string;
  'theme:version': string;
  'theme:darkMode': boolean;
  'state:storeInSessionStorage': boolean;
  'savedObjects:perPage': number;
  'search:queryLanguage': string;
  'shortDots:enable': boolean;
  'sort:options': string;
  'savedObjects:listingLimit': number;
  'query:queryString:options': string;
  pageNavigation: string;
  'metrics:max_buckets': number;
  'query:allowLeadingWildcards': boolean;
  metaFields: string[];
  'indexPattern:placeholder': string;
  'histogram:barTarget': number;
  'histogram:maxBars': number;
  'format:number:defaultLocale': string;
  'format:percent:defaultPattern': string;
  'format:number:defaultPattern': string;
  'history:limit': number;
  'format:defaultTypeMap': string;
  'format:currency:defaultPattern': string;
  defaultIndex: string;
  'format:bytes:defaultPattern': string;
  'filters:pinnedByDefault': boolean;
  'filterEditor:suggestValues': boolean;
  'fields:popularLimit': number;
  dateNanosFormat: string;
  defaultRoute: string;
  'dateFormat:tz': string;
  'dateFormat:scaled': string;
  'csv:quoteValues': boolean;
  'dateFormat:dow': string;
  dateFormat: string;
}
