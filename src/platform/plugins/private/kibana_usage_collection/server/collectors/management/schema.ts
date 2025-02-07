/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import { UsageStats } from './types';

export const stackManagementSchema: MakeSchemaFrom<UsageStats> = {
  'securitySolution:defaultIndex': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'securitySolution:excludedDataTiersForRuleExecution': {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'securitySolution:maxUnassociatedNotes': {
    type: 'integer',
    _meta: { description: 'The maximum number of allowed unassociated notes' },
  },
  'securitySolution:defaultThreatIndex': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'securitySolution:alertTags': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'securitySolution:newsFeedUrl': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'xpackReporting:customPdfLogo': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'notifications:banner': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'xpackDashboardMode:roles': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'securitySolution:ipReputationLinks': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'banners:textContent': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'visualization:heatmap:maxBuckets': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:useLegacyTimeAxis': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:regionmap:showWarnings': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:tileMap:maxPrecision': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'csv:separator': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:tileMap:WMSdefaults': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timelion:target_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timelion:max_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timelion:es.timefield': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timelion:min_interval': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timelion:es.default_index': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:defaultAnomalyScore': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:refreshIntervalDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableNewsFeed': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableAssetCriticality': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:excludeColdAndFrozenTiersInAnalyzer': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableCcsWarning': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableVisualizationsInFlyout': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableGraphVisualization': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'search:includeFrozen': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'courier:maxConcurrentShardRequests': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'courier:setRequestPreference': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'courier:customRequestPreference': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'courier:ignoreFilterIfFieldNotInIndex': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'rollups:enableIndexPatterns': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'notifications:lifetime:warning': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'notifications:lifetime:banner': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'notifications:lifetime:info': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'notifications:lifetime:error': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'doc_table:highlight': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'data_views:cache_max_age': {
    type: 'long',
    _meta: {
      description:
        "Sets the 'max-age' cache header value for data view fields API requests. A value of 0 will disable caching.",
    },
  },
  'discover:searchOnPageLoad': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'doc_table:hideTimeColumn': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:sampleSize': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:sampleRowsPerPage': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:maxDocFieldsDisplayed': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  defaultColumns: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'context:defaultSize': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'context:tieBreakerFields': {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'discover:sort:defaultOrder': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'context:step': { type: 'long', _meta: { description: 'Non-default value of setting.' } },
  'accessibility:disableAnimations': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'fileUpload:maxFileSize': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'ml:anomalyDetection:results:enableTimeDefaults': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'ml:anomalyDetection:results:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timepicker:timeDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timepicker:refreshIntervalDefaults': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'timepicker:quickRanges': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'theme:version': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'theme:darkMode': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'theme:name': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'state:storeInSessionStorage': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'savedObjects:perPage': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'search:queryLanguage': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'shortDots:enable': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'sort:options': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'savedObjects:listingLimit': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'query:queryString:options': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'metrics:max_buckets': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'metrics:allowStringIndices': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'query:allowLeadingWildcards': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  metaFields: {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'indexPattern:placeholder': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'histogram:barTarget': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'histogram:maxBars': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:number:defaultLocale': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:percent:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:number:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'history:limit': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:defaultTypeMap': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:currency:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  defaultIndex: {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'format:bytes:defaultPattern': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'filters:pinnedByDefault': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'filterEditor:suggestValues': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'fields:popularLimit': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  dateNanosFormat: {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  defaultRoute: {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'dateFormat:tz': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'dateFormat:scaled': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'csv:quoteValues': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'dateFormat:dow': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  dateFormat: { type: 'keyword', _meta: { description: 'Non-default value of setting.' } },
  'autocomplete:useTimeRange': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'autocomplete:valueSuggestionMethod': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'search:timeout': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'bfetch:disableCompression': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'bfetch:disable': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:visualize:legacyHeatmapChartsLibrary': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:modifyColumnsOnSwitch': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:rulesTableRefresh': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:syntheticsThrottlingEnabled': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableInspectEsQueries': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:maxSuggestions': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableComparisonByDefault': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableServiceGroups': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableServiceMetrics': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableContinuousRollups': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmAgentExplorerView': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableTableSearchBar': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableServiceInventoryTableSearchBar': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:entityCentricExperience': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmAWSLambdaPriceFactor': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmAWSLambdaRequestCostPerMillion': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:aiAssistantSimulatedFunctionCalling': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:aiAssistantSearchConnectorIndexPattern': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:logSources': {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'banners:placement': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'banners:textColor': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'banners:backgroundColor': {
    type: 'text',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:presentation:timeToPresent': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:canvas:enable_ui': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:canvas:byValueEmbeddable': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:canvas:useDataService': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:dashboard:enable_ui': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'labs:dashboard:deferBelowFold': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:showFieldStatistics': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:showMultiFields': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  enableESQL: {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'discover:rowHeightOption': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  hideAnnouncements: {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  isDefaultIndexMigrated: {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmDefaultServiceEnvironment': {
    type: 'keyword',
    _meta: { description: 'Default value of the setting was changed.' },
  },
  'observability:apmLabsButton': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableAwsLambdaMetrics': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmProgressiveLoading': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmServiceGroupMaxNumberOfServices': {
    type: 'long',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmServiceInventoryOptimizedSorting': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmTraceExplorerTab': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableProfilingIntegration': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableTransactionProfiling': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingShowErrorFrames': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingPerVCPUWattX86': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingPervCPUWattArm64': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingCo2PerKWH': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingDatacenterPUE': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:apmEnableCriticalPath': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableInfrastructureProfilingIntegration': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableInfrastructureAssetCustomDashboards': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:enableGroupedNav': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'securitySolution:showRelatedIntegrations': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'visualization:visualize:legacyGaugeChartsLibrary': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:enableLegacyUptimeApp': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingCostPervCPUPerHour': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingAWSCostDiscountRate': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingAzureCostDiscountRate': {
    type: 'integer',
    _meta: { description: 'Non-default value of setting.' },
  },
  'data_views:fields_excluded_data_tiers': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'devTools:enablePersistentConsole': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'aiAssistant:preferredAIAssistantType': {
    type: 'keyword',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:profilingFetchTopNFunctionsFromStacktraces': {
    type: 'boolean',
    _meta: { description: 'Non-default value of setting.' },
  },
  'observability:searchExcludedDataTiers': {
    type: 'array',
    items: {
      type: 'keyword',
      _meta: { description: 'Non-default value of setting.' },
    },
  },
  'observability:newLogsOverview': {
    type: 'boolean',
    _meta: {
      description: 'Enable the new logs overview component.',
    },
  },
};
