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
  elasticGithubUrl: string;
  docsWebsiteUrl: string;
  searchLabsUrl: string;
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
    readonly elasticAgent: string;
    readonly storageExplorer: string;
    readonly spanCompression: string;
    readonly transactionSampling: string;
    readonly indexLifecycleManagement: string;
  };
  readonly canvas: {
    readonly guide: string;
  };
  readonly cloud: {
    readonly beatsAndLogstashConfiguration: string;
    readonly indexManagement: string;
  };
  readonly console: {
    readonly guide: string;
    readonly serverlessGuide: string;
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
    readonly adaptiveRelevance: string;
    readonly apiRef: string;
    readonly apiClients: string;
    readonly apiKeys: string;
    readonly authentication: string;
    readonly crawlRules: string;
    readonly curations: string;
    readonly duplicateDocuments: string;
    readonly elasticsearchIndexedEngines: string;
    readonly entryPoints: string;
    readonly gettingStarted: string;
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
    readonly webCrawlerReference: string;
  };
  readonly enterpriseSearch: {
    readonly aiSearchDoc: string;
    readonly aiSearchHelp: string;
    readonly apiKeys: string;
    readonly behavioralAnalytics: string;
    readonly behavioralAnalyticsCORS: string;
    readonly behavioralAnalyticsEvents: string;
    readonly buildConnector: string;
    readonly bulkApi: string;
    readonly configuration: string;
    readonly connectors: string;
    readonly connectorsAzureBlobStorage: string;
    readonly connectorsBox: string;
    readonly connectorsClients: string;
    readonly connectorsConfluence: string;
    readonly connectorsContentExtraction: string;
    readonly connectorsDropbox: string;
    readonly connectorsGithub: string;
    readonly connectorsGoogleCloudStorage: string;
    readonly connectorsGoogleDrive: string;
    readonly connectorsGmail: string;
    readonly connectorsJira: string;
    readonly connectorsMicrosoftSQL: string;
    readonly connectorsMongoDB: string;
    readonly connectorsMySQL: string;
    readonly connectorsNative: string;
    readonly connectorsNetworkDrive: string;
    readonly connectorsOneDrive: string;
    readonly connectorsOracle: string;
    readonly connectorsOutlook: string;
    readonly connectorsPostgreSQL: string;
    readonly connectorsS3: string;
    readonly connectorsSalesforce: string;
    readonly connectorsServiceNow: string;
    readonly connectorsSharepoint: string;
    readonly connectorsSharepointOnline: string;
    readonly connectorsTeams: string;
    readonly connectorsSlack: string;
    readonly connectorsZoom: string;
    readonly crawlerExtractionRules: string;
    readonly crawlerManaging: string;
    readonly crawlerOverview: string;
    readonly deployTrainedModels: string;
    readonly documentLevelSecurity: string;
    readonly elser: string;
    readonly engines: string;
    readonly indexApi: string;
    readonly ingestionApis: string;
    readonly ingestPipelines: string;
    readonly knnSearch: string;
    readonly knnSearchCombine: string;
    readonly languageAnalyzers: string;
    readonly languageClients: string;
    readonly licenseManagement: string;
    readonly machineLearningStart: string;
    readonly mailService: string;
    readonly mlDocumentEnrichment: string;
    readonly mlDocumentEnrichmentUpdateMappings: string;
    readonly searchApplicationsTemplates: string;
    readonly searchApplicationsSearchApi: string;
    readonly searchApplications: string;
    readonly searchApplicationsSearch: string;
    readonly searchLabs: string;
    readonly searchLabsRepo: string;
    readonly searchTemplates: string;
    readonly start: string;
    readonly supportedNlpModels: string;
    readonly syncRules: string;
    readonly trainedModels: string;
    readonly textEmbedding: string;
    readonly troubleshootSetup: string;
    readonly usersAccess: string;
  };
  readonly workplaceSearch: {
    readonly apiKeys: string;
    readonly box: string;
    readonly confluenceCloud: string;
    readonly confluenceCloudConnectorPackage: string;
    readonly confluenceServer: string;
    readonly contentSources: string;
    readonly customConnectorPackage: string;
    readonly customSources: string;
    readonly customSourcePermissions: string;
    readonly documentPermissions: string;
    readonly dropbox: string;
    readonly externalSharePointOnline: string;
    readonly externalIdentities: string;
    readonly gatedFormBlog: string;
    readonly gitHub: string;
    readonly gettingStarted: string;
    readonly gmail: string;
    readonly googleDrive: string;
    readonly indexingSchedule: string;
    readonly jiraCloud: string;
    readonly jiraServer: string;
    readonly networkDrive: string;
    readonly oneDrive: string;
    readonly permissions: string;
    readonly privateSourcePermissions: string;
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
    readonly change_point: string;
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
    readonly askElastic: string;
    readonly createGithubIssue: string;
    readonly feedback: string;
    readonly guide: string;
    readonly autocompleteSuggestions: string;
    readonly secureSavedObject: string;
    readonly xpackSecurity: string;
  };
  readonly upgradeAssistant: {
    readonly overview: string;
    readonly batchReindex: string;
    readonly remoteReindex: string;
    readonly reindexWithPipeline: string;
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
    readonly configureAlertSuppression: string;
  };
  readonly securitySolution: {
    readonly artifactControl: string;
    readonly trustedApps: string;
    readonly eventFilters: string;
    readonly blocklist: string;
    readonly endpointArtifacts: string;
    readonly policyResponseTroubleshooting: {
      full_disk_access: string;
      macos_system_ext: string;
      linux_deadlock: string;
    };
    readonly packageActionTroubleshooting: {
      es_connection: string;
    };
    readonly threatIntelInt: string;
    readonly responseActions: string;
    readonly configureEndpointIntegrationPolicy: string;
    readonly exceptions: {
      value_lists: string;
    };
    readonly privileges: string;
    readonly manageDetectionRules: string;
    readonly createEsqlRuleType: string;
  };
  readonly query: {
    readonly eql: string;
    readonly kueryQuerySyntax: string;
    readonly luceneQuery: string;
    readonly luceneQuerySyntax: string;
    readonly percolate: string;
    readonly queryDsl: string;
    readonly queryESQL: string;
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
    indexStats: string;
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
    restApis: string;
    searchPreference: string;
    securityApis: string;
    simulatePipeline: string;
    tasks: string;
    timeUnits: string;
    unfreezeIndex: string;
    updateTransform: string;
  }>;
  readonly observability: Readonly<{
    guide: string;
    infrastructureThreshold: string;
    logsThreshold: string;
    metricsThreshold: string;
    threshold: string;
    monitorStatus: string;
    monitorUptime: string;
    tlsCertificate: string;
    uptimeDurationAnomaly: string;
    monitorLogs: string;
    analyzeMetrics: string;
    monitorUptimeSynthetics: string;
    userExperience: string;
    createAlerts: string;
    syntheticsAlerting: string;
    syntheticsCommandReference: string;
    syntheticsProjectMonitors: string;
    syntheticsMigrateFromIntegration: string;
    sloBurnRateRule: string;
  }>;
  readonly alerting: Readonly<{
    guide: string;
    actionTypes: string;
    apmRules: string;
    emailAction: string;
    emailActionConfig: string;
    emailExchangeClientSecretConfig: string;
    emailExchangeClientIdConfig: string;
    generalSettings: string;
    indexAction: string;
    esQuery: string;
    indexThreshold: string;
    maintenanceWindows: string;
    pagerDutyAction: string;
    preconfiguredConnectors: string;
    preconfiguredAlertHistoryConnector: string;
    serviceNowAction: string;
    serviceNowSIRAction: string;
    setupPrerequisites: string;
    slackAction: string;
    slackApiAction: string;
    teamsAction: string;
    connectors: string;
  }>;
  readonly taskManager: Readonly<{
    healthMonitoring: string;
  }>;
  readonly maps: Readonly<{
    connectToEms: string;
    guide: string;
    importGeospatialPrivileges: string;
    gdalTutorial: string;
    termJoinsExample: string;
  }>;
  readonly monitoring: Record<string, string>;
  readonly reporting: Readonly<{
    cloudMinimumRequirements: string;
    grantUserAccess: string;
    browserSystemDependencies: string;
    browserSandboxDependencies: string;
  }>;
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
    ingestAttachment: string;
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
    esSettings: string;
    settings: string;
    logstashSettings: string;
    kafkaSettings: string;
    settingsFleetServerHostSettings: string;
    settingsFleetServerProxySettings: string;
    troubleshooting: string;
    elasticAgent: string;
    datastreams: string;
    datastreamsILM: string;
    datastreamsNamingScheme: string;
    datastreamsManualRollover: string;
    datastreamsTSDS: string;
    datastreamsTSDSMetrics: string;
    installElasticAgent: string;
    installElasticAgentStandalone: string;
    packageSignatures: string;
    upgradeElasticAgent: string;
    learnMoreBlog: string;
    apiKeysLearnMore: string;
    onPremRegistry: string;
    secureLogstash: string;
    agentPolicy: string;
    api: string;
    uninstallAgent: string;
    installAndUninstallIntegrationAssets: string;
    elasticAgentInputConfiguration: string;
  }>;
  readonly ecs: {
    readonly guide: string;
  };
  readonly clients: {
    readonly guide: string;
    readonly goConnecting: string;
    readonly goGettingStarted: string;
    readonly goIndex: string;
    readonly goOverview: string;
    readonly javaBasicAuthentication: string;
    readonly javaIndex: string;
    readonly javaInstallation: string;
    readonly javaIntroduction: string;
    readonly javaRestLow: string;
    readonly jsAdvancedConfig: string;
    readonly jsApiReference: string;
    readonly jsBasicConfig: string;
    readonly jsClientConnecting: string;
    readonly jsIntro: string;
    readonly netGuide: string;
    readonly netIntroduction: string;
    readonly netNest: string;
    readonly netSingleNode: string;
    readonly phpConfiguration: string;
    readonly phpConnecting: string;
    readonly phpGuide: string;
    readonly phpInstallation: string;
    readonly phpOverview: string;
    readonly pythonAuthentication: string;
    readonly pythonConfig: string;
    readonly pythonConnecting: string;
    readonly pythonGuide: string;
    readonly pythonOverview: string;
    readonly rubyAuthentication: string;
    readonly rubyAdvancedConfig: string;
    readonly rubyBasicConfig: string;
    readonly rubyExamples: string;
    readonly rubyOverview: string;
    readonly rustGuide: string;
    readonly rustOverview: string;
  };
  readonly endpoints: {
    readonly troubleshooting: string;
  };
  readonly legal: {
    readonly privacyStatement: string;
    readonly generalPrivacyStatement: string;
    readonly termsOfService: string;
    readonly dataUse: string;
  };
  readonly kibanaUpgradeSavedObjects: {
    readonly resolveMigrationFailures: string;
    readonly repeatedTimeoutRequests: string;
    readonly routingAllocationDisabled: string;
    readonly clusterShardLimitExceeded: string;
  };
  readonly searchUI: {
    readonly appSearch: string;
    readonly elasticsearch: string;
  };
  readonly serverlessClients: {
    readonly clientLib: string;
    readonly goApiReference: string;
    readonly goGettingStarted: string;
    readonly httpApis: string;
    readonly httpApiReferences: string;
    readonly jsApiReference: string;
    readonly jsGettingStarted: string;
    readonly phpApiReference: string;
    readonly phpGettingStarted: string;
    readonly pythonApiReference: string;
    readonly pythonGettingStarted: string;
    readonly pythonReferences: string;
    readonly rubyApiReference: string;
    readonly rubyGettingStarted: string;
  };
  readonly serverlessSearch: {
    readonly gettingStartedExplore: string;
    readonly gettingStartedIngest: string;
    readonly gettingStartedSearch: string;
    readonly integrations: string;
    readonly integrationsBeats: string;
    readonly integrationsConnectorClient: string;
    readonly integrationsLogstash: string;
  };
  readonly serverlessSecurity: {
    readonly apiKeyPrivileges: string;
  };
  readonly synthetics: {
    readonly featureRoles: string;
  };
  readonly telemetry: {
    readonly settings: string;
  };
}
