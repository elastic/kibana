/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// General settings
export const DISABLE_REQUEST_BATCHING_ID = 'bfetch:disable';
export const DISABLE_BATCH_COMPRESSION_ID = 'bfetch:disableCompression';
export const CSV_QUOTE_VALUES_ID = 'csv:quoteValues';
export const CSV_SEPARATOR_ID = 'csv:separator';
export const DATE_FORMAT_ID = 'dateFormat';
export const DATE_FORMAT_DOW_ID = 'dateFormat:dow';
export const DATE_FORMAT_SCALED_ID = 'dateFormat:scaled';
export const DATE_FORMAT_TZ_ID = 'dateFormat:tz';
export const DATE_FORMAT_NANOS_ID = 'dateNanosFormat';
export const DEFAULT_INDEX_ID = 'defaultIndex';
export const DEFAULT_ROUTE_ID = 'defaultRoute';
export const FIELDS_POPULAR_LIMIT_ID = 'fields:popularLimit';
export const FILE_UPLOAD_MAX_SIZE_ID = 'fileUpload:maxFileSize';
export const FILTER_EDITOR_SUGGEST_VALUES_ID = 'filterEditor:suggestValues';
export const FILTERS_PINNED_BY_DEFAULT_ID = 'filters:pinnedByDefault';
export const FORMAT_BYTES_DEFAULT_PATTERN_ID = 'format:bytes:defaultPattern';
export const FORMAT_CURRENCY_DEFAULT_PATTERN_ID = 'format:currency:defaultPattern';
export const FORMAT_DEFAULT_TYPE_MAP_ID = 'format:defaultTypeMap';
export const FORMAT_NUMBER_DEFAULT_LOCALE_ID = 'format:number:defaultLocale';
export const FORMAT_NUMBER_DEFAULT_PATTERN_ID = 'format:number:defaultPattern';
export const FORMAT_PERCENT_DEFAULT_PATTERN_ID = 'format:percent:defaultPattern';
export const HIDE_ANNOUNCEMENTS_ID = 'hideAnnouncements';
export const HISTOGRAM_BAR_TARGET_ID = 'histogram:barTarget';
export const HISTOGRAM_MAX_BARS_ID = 'histogram:maxBars';
export const HISTORY_LIMIT_ID = 'history:limit';
export const META_FIELDS_ID = 'metaFields';
export const METRICS_ALLOW_CHECKING_FOR_FAILED_SHARDS_ID = 'metrics:allowCheckingForFailedShards';
export const METRICS_ALLOW_STRING_INDICES_ID = 'metrics:allowStringIndices';
export const METRICS_MAX_BUCKETS_ID = 'metrics:max_buckets';
export const QUERY_ALLOW_LEADING_WILDCARDS_ID = 'query:allowLeadingWildcards';
export const QUERY_STRING_OPTIONS_ID = 'query:queryString:options';
export const SAVED_OBJECTS_LISTING_LIMIT_ID = 'savedObjects:listingLimit';
export const SAVED_OBJECTS_PER_PAGE_ID = 'savedObjects:perPage';
export const SEARCH_QUERY_LANGUAGE_ID = 'search:queryLanguage';
export const SHORT_DOTS_ENABLE_ID = 'shortDots:enable';
export const SORT_OPTIONS_ID = 'sort:options';
export const STATE_STORE_IN_SESSION_STORAGE_ID = 'state:storeInSessionStorage';
export const THEME_DARK_MODE_ID = 'theme:darkMode';
export const TIMEPICKER_QUICK_RANGES_ID = 'timepicker:quickRanges';
export const TIMEPICKER_REFRESH_INTERVAL_DEFAULTS_ID = 'timepicker:refreshIntervalDefaults';
export const TIMEPICKER_TIME_DEFAULTS_ID = 'timepicker:timeDefaults';

// Presentation labs settings
export const LABS_CANVAS_BY_VALUE_EMBEDDABLE_ID = 'labs:canvas:byValueEmbeddable';
export const LABS_CANVAS_ENABLE_UI_ID = 'labs:canvas:enable_ui';
export const LABS_DASHBOARD_DEFER_BELOW_FOLD_ID = 'labs:dashboard:deferBelowFold';
export const LABS_DASHBOARDS_ENABLE_UI_ID = 'labs:dashboard:enable_ui';

// Accessibility settings
export const ACCESSIBILITY_DISABLE_ANIMATIONS_ID = 'accessibility:disableAnimations';

// Autocomplete settings
export const AUTOCOMPLETE_USE_TIME_RANGE_ID = 'autocomplete:useTimeRange';
export const AUTOCOMPLETE_VALUE_SUGGESTION_METHOD_ID = 'autocomplete:valueSuggestionMethod';

// Banner settings
export const BANNERS_PLACEMENT_ID = 'banners:placement';
export const BANNERS_TEXT_CONTENT_ID = 'banners:textContent';
export const BANNERS_TEXT_COLOR_ID = 'banners:textColor';
export const BANNERS_BACKGROUND_COLOR_ID = 'banners:backgroundColor';

// Discover settings
export const CONTEXT_DEFAULT_SIZE_ID = 'context:defaultSize';
export const CONTEXT_STEP_ID = 'context:step';
export const CONTEXT_TIE_BREAKER_FIELDS_ID = 'context:tieBreakerFields';
export const DEFAULT_COLUMNS_ID = 'defaultColumns';
export const DISCOVER_ENABLE_SQL_ID = 'discover:enableSql';
export const DISCOVER_MAX_DOC_FIELDS_DISPLAYED_ID = 'discover:maxDocFieldsDisplayed';
export const DISCOVER_MODIFY_COLUMNS_ON_SWITCH_ID = 'discover:modifyColumnsOnSwitch';
export const DISCOVER_ROW_HEIGHT_OPTION_ID = 'discover:rowHeightOption';
export const DISCOVER_SAMPLE_ROWS_PER_PAGE_ID = 'discover:sampleRowsPerPage';
export const DISCOVER_SAMPLE_SIZE_ID = 'discover:sampleSize';
export const DISCOVER_SEARCH_FIELDS_FROM_SOURCE_ID = 'discover:searchFieldsFromSource';
export const DISCOVER_SEARCH_ON_PAGE_LOAD_ID = 'discover:searchOnPageLoad';
export const DISCOVER_SHOW_FIELD_STATISTICS_ID = 'discover:showFieldStatistics';
export const DISCOVER_SHOW_LEGACY_FIELD_TOP_VALUES_ID = 'discover:showLegacyFieldTopValues';
export const DISCOVER_SHOW_MULTI_FIELDS_ID = 'discover:showMultiFields';
export const DISCOVER_SORT_DEFAULT_ORDER_ID = 'discover:sort:defaultOrder';
export const DOC_TABLE_HIDE_TIME_COLUMNS_ID = 'doc_table:hideTimeColumn';
export const DOC_TABLE_HIGHLIGHT_ID = 'doc_table:highlight';
export const DOC_TABLE_LEGACY_ID = 'doc_table:legacy';
export const TRUNCATE_MAX_HEIGHT_ID = 'truncate:maxHeight';

// Machine learning settings
export const ML_ANOMALY_DETECTION_RESULTS_ENABLE_TIME_DEFAULTS_ID =
  'ml:anomalyDetection:results:enableTimeDefaults';
export const ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID =
  'ml:anomalyDetection:results:timeDefaults';

// Notifications settings
export const NOTIFICATIONS_BANNER_ID = 'notifications:banner';
export const NOTIFICATIONS_LIFETIME_BANNER_ID = 'notifications:lifetime:banner';
export const NOTIFICATIONS_LIFETIME_ERROR_ID = 'notifications:lifetime:error';
export const NOTIFICATIONS_LIFETIME_INFO_ID = 'notifications:lifetime:info';
export const NOTIFICATIONS_LIFETIME_WARNING_ID = 'notifications:lifetime:warning';

// Observability settings
export const OBSERVABILITY_APM_AWS_LAMBDA_PRICE_FACTOR_ID = 'observability:apmAWSLambdaPriceFactor';
export const OBSERVABILITY_APM_AWS_LAMBDA_REQUEST_COST_PER_MILLION_ID =
  'observability:apmAWSLambdaRequestCostPerMillion';
export const OBSERVABILITY_APM_AGENT_EXPLORER_VIEW_ID = 'observability:apmAgentExplorerView';
export const OBSERVABILITY_APM_DEFAULT_SERVICE_ENVIRONMENT_ID =
  'observability:apmDefaultServiceEnvironment';
export const OBSERVABILITY_APM_ENABLE_CRITICAL_PATH_ID = 'observability:apmEnableCriticalPath';
export const OBSERVABILITY_APM_LABS_BUTTON_ID = 'observability:apmLabsButton';
export const OBSERVABILITY_APM_PROGRESSIVE_LOADING_ID = 'observability:apmProgressiveLoading';
export const OBSERVABILITY_APM_SERVICE_GROUP_MAX_NUMBER_OF_SERVCIE_ID =
  'observability:apmServiceGroupMaxNumberOfServices';
export const OBSERVABILITY_APM_SERVICE_INVENTORY_OPTIMIZED_SORTING_ID =
  'observability:apmServiceInventoryOptimizedSorting';
export const OBSERVABILITY_APM_TRACE_EXPLORER_TAB_ID = 'observability:apmTraceExplorerTab';
export const OBSERVABILITY_ENABLE_AWS_LAMBDA_METRICS_ID = 'observability:enableAwsLambdaMetrics';
export const OBSERVABILITY_ENABLE_COMPARISON_BY_DEFAULT_ID =
  'observability:enableComparisonByDefault';
export const OBSERVABILITY_ENABLE_INFRASTRUCTURE_HOSTS_VIEW_ID =
  'observability:enableInfrastructureHostsView';
export const OBSERVABILITY_ENABLE_INSPECT_ES_QUERIES_ID = 'observability:enableInspectEsQueries';
export const OBSERVABILITY_MAX_SUGGESTIONS_ID = 'observability:maxSuggestions';
export const OBSERVABILITY_PROFILING_ELASTICSEARCH_PLUGIN_ID =
  'observability:profilingElasticsearchPlugin';
export const OBSERVABILITY_APM_ENABLE_SERVICE_METRICS_ID = 'observability:apmEnableServiceMetrics';
export const OBSERVABILITY_APM_ENABLE_CONTINUOUS_ROLLUPS_ID =
  'observability:apmEnableContinuousRollups';
export const OBSERVABILITY_APM_ENABLE_PROFILING_INTEGRATION_ID =
  'observability:apmEnableProfilingIntegration';

// Reporting settings
export const XPACK_REPORTING_CUSTOM_PDF_LOGO_ID = 'xpackReporting:customPdfLogo';

// Rollups settings
export const ROLLUPS_ENABLE_INDEX_PATTERNS_ID = 'rollups.enableIndexPatterns';

// Search settings
export const COURIER_CUSTOM_REQUEST_PREFERENCE_ID = 'courier:customRequestPreference';
export const COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_ID =
  'courier:ignoreFilterIfFieldNotInIndex';
export const COURIER_MAX_CONCURRENT_SHARD_REQUEST_ID = 'courier:maxConcurrentShardRequests';
export const COURIER_SET_REQUEST_PREFERENCE_ID = 'courier:setRequestPreference';
export const SEARCH_INCLUDE_FROZEN_ID = 'search:includeFrozen';
export const SEARCH_TIMEOUT_ID = 'search:timeout';

// Security solution settings
export const SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID =
  'securitySolution:refreshIntervalDefaults';
export const SECURITY_SOLUTION_TIME_DEFAULTS_ID = 'securitySolution:timeDefaults';
export const SECURITY_SOLUTION_DEFAULT_INDEX_ID = 'securitySolution:defaultIndex';
export const SECURITY_SOLUTION_DEFAULT_THREAT_INDEX_ID = 'securitySolution:defaultThreatIndex';
export const SECURITY_SOLUTION_DEFAULT_ANOMALY_SCORE_ID = 'securitySolution:defaultAnomalyScore';
export const SECURITY_SOLUTION_ENABLE_GROUPED_NAV_ID = 'securitySolution:enableGroupedNav';
export const SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID = 'securitySolution:rulesTableRefresh';
export const SECURITY_SOLUTION_ENABLE_NEWS_FEED_ID = 'securitySolution:enableNewsFeed';
export const SECURITY_SOLUTION_NEWS_FEED_URL_ID = 'securitySolution:newsFeedUrl';
export const SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID = 'securitySolution:ipReputationLinks';
export const SECURITY_SOLUTION_ENABLE_CCS_WARNING_ID = 'securitySolution:enableCcsWarning';
export const SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID =
  'securitySolution:showRelatedIntegrations';
export const SECURITY_SOLUTION_DEFAULT_ALERT_TAGS_KEY = 'securitySolution:alertTags' as const;
/** This Kibana Advanced Setting allows users to enable/disable the Expandable Flyout */
export const SECURITY_SOLUTION_ENABLE_EXPANDABLE_FLYOUT_SETTING =
  'securitySolution:enableExpandableFlyout' as const;

// Timelion settings
export const TIMELION_ES_DEFAULT_INDEX_ID = 'timelion:es.default_index';
export const TIMELION_ES_TIME_FIELD_ID = 'timelion:es.timefield';
export const TIMELION_MAX_BUCKETS_ID = 'timelion:max_buckets';
export const TIMELION_MIN_INTERVAL_ID = 'timelion:min_interval';
export const TIMELION_TARGET_BUCKETS_ID = 'timelion:target_buckets';

// Visualization settings
export const VISUALIZATION_COLOR_MAPPING_ID = 'visualization:colorMapping';
export const VISUALIZATION_HEATMAP_MAX_BUCKETS_ID = 'visualization:heatmap:maxBuckets';
export const VISUALIZATION_USE_LEGACY_TIME_AXIS_ID = 'visualization:useLegacyTimeAxis';
export const VISUALIZATION_LEGACY_GAUGE_CHARTS_LIBRARY_ID =
  'visualization:visualize:legacyGaugeChartsLibrary';
export const VISUALIZATION_LEGACY_HEATMAP_CHARTS_LIBRARY_ID =
  'visualization:visualize:legacyHeatmapChartsLibrary';
export const VISUALIZATION_ENABLE_LABS_ID = 'visualize:enableLabs';
