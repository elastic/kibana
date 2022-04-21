/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * @public
 */
export interface DocLinksMeta {
  version: string;
  elasticWebsiteUrl: string;
}

/**
 * @public
 */
export interface DocLinks {
  readonly settings: string;
  readonly elasticStackGetStarted: string;
  readonly upgrade: {
    readonly upgradingStackOnPrem: string;
    readonly upgradingStackOnCloud: string;
  };
  readonly apm: {
    readonly kibanaSettings: string;
    readonly supportedServiceMaps: string;
    readonly customLinks: string;
    readonly droppedTransactionSpans: string;
    readonly upgrading: string;
    readonly metaData: string;
    readonly overview: string;
    readonly tailSamplingPolicies: string;
  };
  readonly canvas: {
    readonly guide: string;
  };
  readonly cloud: {
    readonly indexManagement: string;
  };
  readonly console: {
    readonly guide: string;
  };
  readonly dashboard: {
    readonly guide: string;
    readonly drilldowns: string;
    readonly drilldownsTriggerPicker: string;
    readonly urlDrilldownTemplateSyntax: string;
    readonly urlDrilldownVariables: string;
  };
  readonly discover: Record<string, string>;
  readonly filebeat: {
    readonly base: string;
    readonly installation: string;
    readonly configuration: string;
    readonly elasticsearchOutput: string;
    readonly elasticsearchModule: string;
    readonly startup: string;
    readonly exportedFields: string;
    readonly suricataModule: string;
    readonly zeekModule: string;
  };
  readonly auditbeat: {
    readonly base: string;
    readonly auditdModule: string;
    readonly systemModule: string;
  };
  readonly metricbeat: {
    readonly base: string;
    readonly configure: string;
    readonly httpEndpoint: string;
    readonly install: string;
    readonly start: string;
  };
  readonly appSearch: {
    readonly apiRef: string;
    readonly apiClients: string;
    readonly apiKeys: string;
    readonly authentication: string;
    readonly crawlRules: string;
    readonly curations: string;
    readonly duplicateDocuments: string;
    readonly entryPoints: string;
    readonly guide: string;
    readonly indexingDocuments: string;
    readonly indexingDocumentsSchema: string;
    readonly logSettings: string;
    readonly metaEngines: string;
    readonly precisionTuning: string;
    readonly relevanceTuning: string;
    readonly resultSettings: string;
    readonly searchUI: string;
    readonly security: string;
    readonly synonyms: string;
    readonly webCrawler: string;
    readonly webCrawlerEventLogs: string;
  };
  readonly enterpriseSearch: {
    readonly configuration: string;
    readonly licenseManagement: string;
    readonly mailService: string;
    readonly troubleshootSetup: string;
    readonly usersAccess: string;
  };
  readonly workplaceSearch: {
    readonly apiKeys: string;
    readonly box: string;
    readonly confluenceCloud: string;
    readonly confluenceServer: string;
    readonly customSources: string;
    readonly customSourcePermissions: string;
    readonly documentPermissions: string;
    readonly dropbox: string;
    readonly externalSharePointOnline: string;
    readonly externalIdentities: string;
    readonly gitHub: string;
    readonly gettingStarted: string;
    readonly gmail: string;
    readonly googleDrive: string;
    readonly indexingSchedule: string;
    readonly jiraCloud: string;
    readonly jiraServer: string;
    readonly oneDrive: string;
    readonly permissions: string;
    readonly salesforce: string;
    readonly security: string;
    readonly serviceNow: string;
    readonly sharePoint: string;
    readonly sharePointServer: string;
    readonly slack: string;
    readonly synch: string;
    readonly zendesk: string;
  };
  readonly heartbeat: {
    readonly base: string;
  };
  readonly libbeat: {
    readonly getStarted: string;
  };
  readonly logstash: {
    readonly base: string;
    readonly inputElasticAgent: string;
  };
  readonly functionbeat: {
    readonly base: string;
  };
  readonly winlogbeat: {
    readonly base: string;
  };
  readonly aggs: {
    readonly composite: string;
    readonly composite_missing_bucket: string;
    readonly date_histogram: string;
    readonly date_range: string;
    readonly date_format_pattern: string;
    readonly filter: string;
    readonly filters: string;
    readonly geohash_grid: string;
    readonly histogram: string;
    readonly ip_range: string;
    readonly range: string;
    readonly significant_terms: string;
    readonly terms: string;
    readonly terms_doc_count_error: string;
    readonly rare_terms: string;
    readonly avg: string;
    readonly avg_bucket: string;
    readonly max_bucket: string;
    readonly min_bucket: string;
    readonly sum_bucket: string;
    readonly cardinality: string;
    readonly count: string;
    readonly cumulative_sum: string;
    readonly derivative: string;
    readonly geo_bounds: string;
    readonly geo_centroid: string;
    readonly max: string;
    readonly median: string;
    readonly min: string;
    readonly moving_avg: string;
    readonly percentile_ranks: string;
    readonly serial_diff: string;
    readonly std_dev: string;
    readonly sum: string;
    readonly top_hits: string;
  };
  readonly runtimeFields: {
    readonly overview: string;
    readonly mapping: string;
  };
  readonly scriptedFields: {
    readonly scriptFields: string;
    readonly scriptAggs: string;
    readonly painless: string;
    readonly painlessApi: string;
    readonly painlessLangSpec: string;
    readonly painlessSyntax: string;
    readonly painlessWalkthrough: string;
    readonly luceneExpressions: string;
  };
  readonly search: {
    readonly sessions: string;
    readonly sessionLimits: string;
  };
  readonly indexPatterns: {
    readonly introduction: string;
    readonly fieldFormattersNumber: string;
    readonly fieldFormattersString: string;
    readonly runtimeFields: string;
  };
  readonly addData: string;
  readonly kibana: {
    readonly guide: string;
    readonly autocompleteSuggestions: string;
    readonly secureSavedObject: string;
    readonly xpackSecurity: string;
  };
  readonly upgradeAssistant: {
    readonly overview: string;
    readonly batchReindex: string;
    readonly remoteReindex: string;
  };
  readonly rollupJobs: string;
  readonly elasticsearch: Record<string, string>;
  readonly siem: {
    readonly privileges: string;
    readonly guide: string;
    readonly gettingStarted: string;
    readonly ml: string;
    readonly ruleChangeLog: string;
    readonly detectionsReq: string;
    readonly networkMap: string;
    readonly troubleshootGaps: string;
    readonly ruleApiOverview: string;
  };
  readonly securitySolution: {
    readonly trustedApps: string;
    readonly eventFilters: string;
    readonly blocklist: string;
  };
  readonly query: {
    readonly eql: string;
    readonly kueryQuerySyntax: string;
    readonly luceneQuery: string;
    readonly luceneQuerySyntax: string;
    readonly percolate: string;
    readonly queryDsl: string;
  };
  readonly date: {
    readonly dateMath: string;
    readonly dateMathIndexNames: string;
  };
  readonly management: Record<string, string>;
  readonly ml: Record<string, string>;
  readonly transforms: Record<string, string>;
  readonly visualize: Record<string, string>;
  readonly apis: Readonly<{
    bulkIndexAlias: string;
    byteSizeUnits: string;
    createAutoFollowPattern: string;
    createFollower: string;
    createIndex: string;
    createSnapshotLifecyclePolicy: string;
    createRoleMapping: string;
    createRoleMappingTemplates: string;
    createRollupJobsRequest: string;
    createApiKey: string;
    createPipeline: string;
    createTransformRequest: string;
    cronExpressions: string;
    executeWatchActionModes: string;
    indexExists: string;
    multiSearch: string;
    openIndex: string;
    putComponentTemplate: string;
    painlessExecute: string;
    painlessExecuteAPIContexts: string;
    putComponentTemplateMetadata: string;
    putSnapshotLifecyclePolicy: string;
    putIndexTemplateV1: string;
    putWatch: string;
    searchPreference: string;
    simulatePipeline: string;
    timeUnits: string;
    unfreezeIndex: string;
    updateTransform: string;
  }>;
  readonly observability: Readonly<{
    guide: string;
    infrastructureThreshold: string;
    logsThreshold: string;
    metricsThreshold: string;
    monitorStatus: string;
    monitorUptime: string;
    tlsCertificate: string;
    uptimeDurationAnomaly: string;
    monitorLogs: string;
    analyzeMetrics: string;
    monitorUptimeSynthetics: string;
    userExperience: string;
    createAlerts: string;
  }>;
  readonly alerting: Record<string, string>;
  readonly maps: Readonly<{
    guide: string;
    importGeospatialPrivileges: string;
    gdalTutorial: string;
  }>;
  readonly monitoring: Record<string, string>;
  readonly security: Readonly<{
    apiKeyServiceSettings: string;
    clusterPrivileges: string;
    elasticsearchSettings: string;
    elasticsearchEnableSecurity: string;
    elasticsearchEnableApiKeys: string;
    indicesPrivileges: string;
    kibanaTLS: string;
    kibanaPrivileges: string;
    mappingRoles: string;
    mappingRolesFieldRules: string;
    runAsPrivilege: string;
  }>;
  readonly spaces: Readonly<{
    kibanaLegacyUrlAliases: string;
    kibanaDisableLegacyUrlAliasesApi: string;
  }>;
  readonly watcher: Record<string, string>;
  readonly ccs: Record<string, string>;
  readonly plugins: {
    azureRepo: string;
    gcsRepo: string;
    hdfsRepo: string;
    s3Repo: string;
    snapshotRestoreRepos: string;
    mapperSize: string;
  };
  readonly snapshotRestore: Record<string, string>;
  readonly ingest: Record<string, string>;
  readonly fleet: Readonly<{
    beatsAgentComparison: string;
    guide: string;
    fleetServer: string;
    fleetServerAddFleetServer: string;
    settings: string;
    settingsFleetServerHostSettings: string;
    settingsFleetServerProxySettings: string;
    troubleshooting: string;
    elasticAgent: string;
    datastreams: string;
    datastreamsILM: string;
    datastreamsNamingScheme: string;
    installElasticAgent: string;
    installElasticAgentStandalone: string;
    upgradeElasticAgent: string;
    upgradeElasticAgent712lower: string;
    learnMoreBlog: string;
    apiKeysLearnMore: string;
    onPremRegistry: string;
  }>;
  readonly ecs: {
    readonly guide: string;
  };
  readonly clients: {
    readonly guide: string;
    readonly goIndex: string;
    readonly goOverview: string;
    readonly javaBasicAuthentication: string;
    readonly javaIndex: string;
    readonly javaInstallation: string;
    readonly javaIntroduction: string;
    readonly javaRestLow: string;
    readonly jsClientConnecting: string;
    readonly jsIntro: string;
    readonly netGuide: string;
    readonly netIntroduction: string;
    readonly netNest: string;
    readonly netSingleNode: string;
    readonly perlGuide: string;
    readonly phpGuide: string;
    readonly phpConnecting: string;
    readonly phpInstallation: string;
    readonly phpOverview: string;
    readonly pythonAuthentication: string;
    readonly pythonGuide: string;
    readonly pythonOverview: string;
    readonly rubyAuthentication: string;
    readonly rubyOverview: string;
    readonly rustGuide: string;
    readonly rustOverview: string;
  };
  readonly endpoints: {
    readonly troubleshooting: string;
  };
  readonly legal: {
    readonly privacyStatement: string;
  };
}
