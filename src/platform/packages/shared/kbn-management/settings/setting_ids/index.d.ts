/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const DISABLE_REQUEST_BATCHING_ID = 'bfetch:disable';
export declare const ELASTIC_CONSOLE_ENABLED_SETTING_ID = 'elasticRamen:enabled';
export declare const DISABLE_BATCH_COMPRESSION_ID = 'bfetch:disableCompression';
export declare const CSV_QUOTE_VALUES_ID = 'csv:quoteValues';
export declare const CSV_SEPARATOR_ID = 'csv:separator';
export declare const DATE_FORMAT_ID = 'dateFormat';
export declare const DATE_FORMAT_DOW_ID = 'dateFormat:dow';
export declare const DATE_FORMAT_SCALED_ID = 'dateFormat:scaled';
export declare const DATE_FORMAT_TZ_ID = 'dateFormat:tz';
export declare const DATE_FORMAT_NANOS_ID = 'dateNanosFormat';
export declare const DEFAULT_INDEX_ID = 'defaultIndex';
export declare const DEFAULT_ROUTE_ID = 'defaultRoute';
export declare const FIELDS_POPULAR_LIMIT_ID = 'fields:popularLimit';
export declare const FILE_UPLOAD_MAX_SIZE_ID = 'fileUpload:maxFileSize';
export declare const FILTER_EDITOR_SUGGEST_VALUES_ID = 'filterEditor:suggestValues';
export declare const FILTERS_PINNED_BY_DEFAULT_ID = 'filters:pinnedByDefault';
export declare const FORMAT_BYTES_DEFAULT_PATTERN_ID = 'format:bytes:defaultPattern';
export declare const FORMAT_CURRENCY_DEFAULT_PATTERN_ID = 'format:currency:defaultPattern';
export declare const FORMAT_DEFAULT_TYPE_MAP_ID = 'format:defaultTypeMap';
export declare const FORMAT_NUMBER_DEFAULT_LOCALE_ID = 'format:number:defaultLocale';
export declare const FORMAT_NUMBER_DEFAULT_PATTERN_ID = 'format:number:defaultPattern';
export declare const FORMAT_PERCENT_DEFAULT_PATTERN_ID = 'format:percent:defaultPattern';
export declare const HIDE_ANNOUNCEMENTS_ID = 'hideAnnouncements';
export declare const HISTOGRAM_BAR_TARGET_ID = 'histogram:barTarget';
export declare const HISTOGRAM_MAX_BARS_ID = 'histogram:maxBars';
export declare const HISTORY_LIMIT_ID = 'history:limit';
export declare const META_FIELDS_ID = 'metaFields';
export declare const METRICS_ALLOW_STRING_INDICES_ID = 'metrics:allowStringIndices';
export declare const METRICS_MAX_BUCKETS_ID = 'metrics:max_buckets';
export declare const QUERY_ALLOW_LEADING_WILDCARDS_ID = 'query:allowLeadingWildcards';
export declare const QUERY_STRING_OPTIONS_ID = 'query:queryString:options';
export declare const SAVED_OBJECTS_LISTING_LIMIT_ID = 'savedObjects:listingLimit';
export declare const SAVED_OBJECTS_PER_PAGE_ID = 'savedObjects:perPage';
export declare const SEARCH_QUERY_LANGUAGE_ID = 'search:queryLanguage';
export declare const SHORT_DOTS_ENABLE_ID = 'shortDots:enable';
export declare const SORT_OPTIONS_ID = 'sort:options';
export declare const STATE_STORE_IN_SESSION_STORAGE_ID = 'state:storeInSessionStorage';
export declare const THEME_DARK_MODE_ID = 'theme:darkMode';
export declare const THEME_NAME_ID = 'theme:name';
export declare const TIMEPICKER_QUICK_RANGES_ID = 'timepicker:quickRanges';
export declare const TIMEPICKER_REFRESH_INTERVAL_DEFAULTS_ID = 'timepicker:refreshIntervalDefaults';
export declare const TIMEPICKER_TIME_DEFAULTS_ID = 'timepicker:timeDefaults';
export declare const LABS_CANVAS_BY_VALUE_EMBEDDABLE_ID = 'labs:canvas:byValueEmbeddable';
export declare const LABS_CANVAS_ENABLE_UI_ID = 'labs:canvas:enable_ui';
export declare const LABS_DASHBOARD_DEFER_BELOW_FOLD_ID = 'labs:dashboard:deferBelowFold';
export declare const LABS_DASHBOARDS_ENABLE_UI_ID = 'labs:dashboard:enable_ui';
export declare const ACCESSIBILITY_DISABLE_ANIMATIONS_ID = 'accessibility:disableAnimations';
export declare const AGENT_BUILDER_NAV_ENABLED_SETTING_ID = 'agentBuilder:navEnabled';
export declare const AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID =
  'agentBuilder:experimentalFeatures';
export declare const AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS = 'agentBuilder:prePromptWorkflowIds';
export declare const AUTOCOMPLETE_USE_TIME_RANGE_ID = 'autocomplete:useTimeRange';
export declare const AUTOCOMPLETE_VALUE_SUGGESTION_METHOD_ID = 'autocomplete:valueSuggestionMethod';
export declare const BANNERS_PLACEMENT_ID = 'banners:placement';
export declare const BANNERS_TEXT_CONTENT_ID = 'banners:textContent';
export declare const BANNERS_TEXT_COLOR_ID = 'banners:textColor';
export declare const BANNERS_LINK_COLOR_ID = 'banners:linkColor';
export declare const BANNERS_BACKGROUND_COLOR_ID = 'banners:backgroundColor';
export declare const CONTEXT_DEFAULT_SIZE_ID = 'context:defaultSize';
export declare const CONTEXT_STEP_ID = 'context:step';
export declare const CONTEXT_TIE_BREAKER_FIELDS_ID = 'context:tieBreakerFields';
export declare const DEFAULT_COLUMNS_ID = 'defaultColumns';
export declare const ENABLE_ESQL_ID = 'enableESQL';
export declare const DISCOVER_MAX_DOC_FIELDS_DISPLAYED_ID = 'discover:maxDocFieldsDisplayed';
export declare const DISCOVER_MODIFY_COLUMNS_ON_SWITCH_ID = 'discover:modifyColumnsOnSwitch';
export declare const DISCOVER_ROW_HEIGHT_OPTION_ID = 'discover:rowHeightOption';
export declare const DISCOVER_SAMPLE_ROWS_PER_PAGE_ID = 'discover:sampleRowsPerPage';
export declare const DISCOVER_SAMPLE_SIZE_ID = 'discover:sampleSize';
export declare const DISCOVER_SEARCH_ON_PAGE_LOAD_ID = 'discover:searchOnPageLoad';
export declare const DISCOVER_SHOW_FIELD_STATISTICS_ID = 'discover:showFieldStatistics';
export declare const DISCOVER_SHOW_MULTI_FIELDS_ID = 'discover:showMultiFields';
export declare const DISCOVER_SORT_DEFAULT_ORDER_ID = 'discover:sort:defaultOrder';
export declare const DOC_TABLE_HIDE_TIME_COLUMNS_ID = 'doc_table:hideTimeColumn';
export declare const DOC_TABLE_HIGHLIGHT_ID = 'doc_table:highlight';
export declare const ML_ANOMALY_DETECTION_RESULTS_ENABLE_TIME_DEFAULTS_ID =
  'ml:anomalyDetection:results:enableTimeDefaults';
export declare const ML_ANOMALY_DETECTION_RESULTS_TIME_DEFAULTS_ID =
  'ml:anomalyDetection:results:timeDefaults';
export declare const NOTIFICATIONS_BANNER_ID = 'notifications:banner';
export declare const NOTIFICATIONS_LIFETIME_BANNER_ID = 'notifications:lifetime:banner';
export declare const NOTIFICATIONS_LIFETIME_ERROR_ID = 'notifications:lifetime:error';
export declare const NOTIFICATIONS_LIFETIME_INFO_ID = 'notifications:lifetime:info';
export declare const NOTIFICATIONS_LIFETIME_WARNING_ID = 'notifications:lifetime:warning';
export declare const OBSERVABILITY_APM_AWS_LAMBDA_PRICE_FACTOR_ID =
  'observability:apmAWSLambdaPriceFactor';
export declare const OBSERVABILITY_APM_AWS_LAMBDA_REQUEST_COST_PER_MILLION_ID =
  'observability:apmAWSLambdaRequestCostPerMillion';
export declare const OBSERVABILITY_APM_DEFAULT_SERVICE_ENVIRONMENT_ID =
  'observability:apmDefaultServiceEnvironment';
export declare const OBSERVABILITY_APM_PROGRESSIVE_LOADING_ID =
  'observability:apmProgressiveLoading';
export declare const OBSERVABILITY_APM_SERVICE_GROUP_MAX_NUMBER_OF_SERVICE_ID =
  'observability:apmServiceGroupMaxNumberOfServices';
export declare const OBSERVABILITY_ENABLE_COMPARISON_BY_DEFAULT_ID =
  'observability:enableComparisonByDefault';
export declare const OBSERVABILITY_ENABLE_INFRASTRUCTURE_ASSET_CUSTOM_DASHBOARDS_ID =
  'observability:enableInfrastructureAssetCustomDashboards';
export declare const OBSERVABILITY_ENABLE_INSPECT_ES_QUERIES_ID =
  'observability:enableInspectEsQueries';
export declare const OBSERVABILITY_MAX_SUGGESTIONS_ID = 'observability:maxSuggestions';
export declare const OBSERVABILITY_APM_ENABLE_TABLE_SEARCH_BAR =
  'observability:apmEnableTableSearchBar';
export declare const OBSERVABILITY_APM_ENABLE_SERVICE_INVENTORY_TABLE_SEARCH_BAR =
  'observability:apmEnableServiceInventoryTableSearchBar';
export declare const OBSERVABILITY_LOGS_SHARED_NEW_LOGS_OVERVIEW_ID =
  'observability:newLogsOverview';
export declare const OBSERVABILITY_LOGS_DATA_ACCESS_LOG_SOURCES_ID = 'observability:logSources';
export declare const OBSERVABILITY_AI_ASSISTANT_SIMULATED_FUNCTION_CALLING =
  'observability:aiAssistantSimulatedFunctionCalling';
export declare const OBSERVABILITY_AI_ASSISTANT_SEARCH_CONNECTOR_INDEX_PATTERN =
  'observability:aiAssistantSearchConnectorIndexPattern';
export declare const GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR = 'genAiSettings:defaultAIConnector';
export declare const GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY =
  'genAiSettings:defaultAIConnectorOnly';
export declare const GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING = 'genAiSettings:tokenUsageTracking';
export declare const AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE =
  'aiAssistant:preferredAIAssistantType';
export declare const AI_CHAT_EXPERIENCE_TYPE = 'aiAssistant:preferredChatExperience';
export declare const AI_ANONYMIZATION_SETTINGS = 'ai:anonymizationSettings';
export declare const OBSERVABILITY_SEARCH_EXCLUDED_DATA_TIERS =
  'observability:searchExcludedDataTiers';
export declare const OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS =
  'observability:streamsEnableSignificantEvents';
export declare const OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS_DISCOVERY =
  'observability:streamsEnableSignificantEventsDiscovery';
export declare const OBSERVABILITY_STREAMS_ENABLE_GROUP_STREAMS =
  'observability:streamsEnableGroupStreams';
export declare const OBSERVABILITY_STREAMS_ENABLE_QUERY_STREAMS =
  'observability:streamsEnableQueryStreams';
export declare const OBSERVABILITY_STREAMS_ENABLE_CONTENT_PACKS =
  'observability:streamsEnableContentPacks';
export declare const OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS =
  'observability:streamsEnableWiredStreamViews';
export declare const OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS =
  'observability:streamsEnableDraftStreams';
export declare const OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED =
  'observability:streamsContinuousKiExtractionEnabled';
export declare const OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS =
  'observability:streamsContinuousKiExtractionIntervalHours';
export declare const OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_EXCLUDED_STREAM_PATTERNS =
  'observability:streamsContinuousKiExtractionExcludedStreamPatterns';
export declare const OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS =
  'observability:streamsSigEventsIndexPatterns';
export declare const OBSERVABILITY_STREAMS_SIG_EVENTS_TUNING_CONFIG =
  'observability:streamsSigEventsTuningConfig';
export declare const OBSERVABILITY_STREAMS_ENABLE_MEMORY = 'observability:streamsEnableMemory';
export declare const OBSERVABILITY_ENABLE_DIAGNOSTIC_MODE = 'observability:enableDiagnosticMode';
export declare const XPACK_REPORTING_CUSTOM_PDF_LOGO_ID = 'xpackReporting:customPdfLogo';
export declare const ROLLUPS_ENABLE_INDEX_PATTERNS_ID = 'rollups.enableIndexPatterns';
export declare const COURIER_CUSTOM_REQUEST_PREFERENCE_ID = 'courier:customRequestPreference';
export declare const COURIER_IGNORE_FILTER_IF_FIELD_NOT_IN_INDEX_ID =
  'courier:ignoreFilterIfFieldNotInIndex';
export declare const COURIER_MAX_CONCURRENT_SHARD_REQUEST_ID = 'courier:maxConcurrentShardRequests';
export declare const COURIER_SET_REQUEST_PREFERENCE_ID = 'courier:setRequestPreference';
export declare const SEARCH_INCLUDE_FROZEN_ID = 'search:includeFrozen';
export declare const SEARCH_TIMEOUT_ID = 'search:timeout';
export declare const QUERY_ACTIVITY_MIN_RUNNING_TIME_ID = 'query_activity:minRunningTime';
export declare const SECURITY_SOLUTION_REFRESH_INTERVAL_DEFAULTS_ID =
  'securitySolution:refreshIntervalDefaults';
export declare const SECURITY_SOLUTION_TIME_DEFAULTS_ID = 'securitySolution:timeDefaults';
export declare const SECURITY_SOLUTION_DEFAULT_INDEX_ID = 'securitySolution:defaultIndex';
export declare const SECURITY_SOLUTION_DEFAULT_THREAT_INDEX_ID =
  'securitySolution:defaultThreatIndex';
export declare const SECURITY_SOLUTION_DEFAULT_ANOMALY_SCORE_ID =
  'securitySolution:defaultAnomalyScore';
export declare const SECURITY_SOLUTION_ENABLE_GROUPED_NAV_ID = 'securitySolution:enableGroupedNav';
export declare const SECURITY_SOLUTION_RULES_TABLE_REFRESH_ID =
  'securitySolution:rulesTableRefresh';
export declare const SECURITY_SOLUTION_ENABLE_NEWS_FEED_ID = 'securitySolution:enableNewsFeed';
export declare const SECURITY_SOLUTION_NEWS_FEED_URL_ID = 'securitySolution:newsFeedUrl';
export declare const SECURITY_SOLUTION_IP_REPUTATION_LINKS_ID =
  'securitySolution:ipReputationLinks';
export declare const SECURITY_SOLUTION_SHOW_RELATED_INTEGRATIONS_ID =
  'securitySolution:showRelatedIntegrations';
export declare const SECURITY_SOLUTION_SUPPRESSION_BEHAVIOR_ON_ALERT_CLOSURE_SETTING: 'securitySolution:suppressionBehaviorOnAlertClosure';
export declare const SECURITY_SOLUTION_DEFAULT_ALERT_TAGS_KEY: 'securitySolution:alertTags';
export declare const SECURITY_SOLUTION_EXCLUDED_GAP_REASONS_KEY: 'securitySolution:excludedGapReasons';
/** This Kibana Advanced Setting allows users to enable/disable the Asset Criticality feature */
export declare const SECURITY_SOLUTION_ENABLE_ASSET_CRITICALITY_SETTING: 'securitySolution:enableAssetCriticality';
export declare const SECURITY_SOLUTION_ENABLE_ASSET_INVENTORY_SETTING: 'securitySolution:enableAssetInventory';
export declare const SECURITY_SOLUTION_ENABLE_CLOUD_CONNECTOR_SETTING: 'securitySolution:enableCloudConnector';
export declare const SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_MINUTES: 'securitySolution:defaultValueReportMinutes';
export declare const SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_RATE: 'securitySolution:defaultValueReportRate';
export declare const SECURITY_SOLUTION_DEFAULT_VALUE_REPORT_TITLE: 'securitySolution:defaultValueReportTitle';
export declare const CASES_MAX_OPEN_CASES_PER_RULE_RUN_ID: 'cases:maxOpenCasesPerRuleRun';
export declare const TIMELION_ES_DEFAULT_INDEX_ID = 'timelion:es.default_index';
export declare const TIMELION_ES_TIME_FIELD_ID = 'timelion:es.timefield';
export declare const TIMELION_MAX_BUCKETS_ID = 'timelion:max_buckets';
export declare const TIMELION_MIN_INTERVAL_ID = 'timelion:min_interval';
export declare const TIMELION_TARGET_BUCKETS_ID = 'timelion:target_buckets';
export declare const VISUALIZATION_HEATMAP_MAX_BUCKETS_ID = 'visualization:heatmap:maxBuckets';
export declare const VISUALIZATION_LEGACY_GAUGE_CHARTS_LIBRARY_ID =
  'visualization:visualize:legacyGaugeChartsLibrary';
export declare const VISUALIZATION_LEGACY_HEATMAP_CHARTS_LIBRARY_ID =
  'visualization:visualize:legacyHeatmapChartsLibrary';
export declare const VISUALIZATION_ENABLE_LABS_ID = 'visualize:enableLabs';
