/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface UsageStats {
  /**
   * sensitive settings
   */
  'securitySolution:defaultIndex': string;
  'securitySolution:defaultThreatIndex': string;
  'securitySolution:newsFeedUrl': string;
  'xpackReporting:customPdfLogo': string;
  'notifications:banner': string;
  'xpackDashboardMode:roles': string;
  'securitySolution:ipReputationLinks': string;
  'banners:textContent': string;
  /**
   * non-sensitive settings
   */
  'bfetch:disable': boolean;
  'bfetch:disableCompression': boolean;
  'autocomplete:useTimeRange': boolean;
  'autocomplete:valueSuggestionMethod': string;
  'search:timeout': number;
  'visualization:visualize:legacyPieChartsLibrary': boolean;
  'visualization:visualize:legacyHeatmapChartsLibrary': boolean;
  'doc_table:legacy': boolean;
  'discover:modifyColumnsOnSwitch': boolean;
  'discover:searchFieldsFromSource': boolean;
  'discover:showFieldStatistics': boolean;
  'discover:showMultiFields': boolean;
  'discover:maxDocFieldsDisplayed': number;
  'securitySolution:rulesTableRefresh': string;
  'observability:enableInspectEsQueries': boolean;
  'observability:maxSuggestions': number;
  'observability:enableComparisonByDefault': boolean;
  'observability:enableInfrastructureView': boolean;
  'observability:enableServiceGroups': boolean;
  'visualize:enableLabs': boolean;
  'visualization:heatmap:maxBuckets': number;
  'visualization:colorMapping': string;
  'visualization:useLegacyTimeAxis': boolean;
  'visualization:regionmap:showWarnings': boolean;
  'visualization:tileMap:maxPrecision': number;
  'csv:separator': string;
  'visualization:tileMap:WMSdefaults': string;
  'timelion:legacyChartsLibrary': boolean;
  'timelion:target_buckets': number;
  'timelion:max_buckets': number;
  'timelion:es.timefield': string;
  'timelion:min_interval': string;
  'timelion:es.default_index': string;
  'securitySolution:timeDefaults': string;
  'securitySolution:defaultAnomalyScore': number;
  'securitySolution:refreshIntervalDefaults': string;
  'securitySolution:enableNewsFeed': boolean;
  'securitySolution:enableCcsWarning': boolean;
  'search:includeFrozen': boolean;
  'courier:maxConcurrentShardRequests': number;
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
  'doc_table:hideTimeColumn': boolean;
  'discover:sampleSize': number;
  defaultColumns: string[];
  'context:defaultSize': number;
  'context:tieBreakerFields': string[];
  'discover:sort:defaultOrder': string;
  'context:step': number;
  'accessibility:disableAnimations': boolean;
  'fileUpload:maxFileSize': string;
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
  'metrics:max_buckets': number;
  'metrics:allowStringIndices': boolean;
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
  'banners:placement': string;
  'banners:textColor': string;
  'banners:backgroundColor': string;
  'labs:canvas:enable_ui': boolean;
  'labs:canvas:byValueEmbeddable': boolean;
  'labs:canvas:useDataService': boolean;
  'labs:presentation:timeToPresent': boolean;
  'labs:dashboard:enable_ui': boolean;
  'labs:dashboard:deferBelowFold': boolean;
  'labs:dashboard:dashboardControls': boolean;
}
