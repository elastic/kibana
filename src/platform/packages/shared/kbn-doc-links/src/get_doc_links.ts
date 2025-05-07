/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deepFreeze } from '@kbn/std';
import type { DocLinks, BuildFlavor } from './types';
import { getDocLinksMeta } from './get_doc_meta';

export interface GetDocLinkOptions {
  kibanaBranch: string;
  buildFlavor: BuildFlavor;
}

export const getDocLinks = ({ kibanaBranch, buildFlavor }: GetDocLinkOptions): DocLinks => {
  const meta = getDocLinksMeta({ kibanaBranch, buildFlavor });

  const DOC_LINK_VERSION = meta.version;
  const ECS_VERSION = meta.ecs_version;
  const ELASTIC_WEBSITE_URL = meta.elasticWebsiteUrl;
  const ELASTIC_GITHUB = meta.elasticGithubUrl;
  const SEARCH_LABS_URL = meta.searchLabsUrl;
  const API_DOCS = meta.apiDocsUrl;
  const ELASTIC_DOCS = meta.docsWebsiteUrl;

  const ELASTICSEARCH_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;
  const ELASTICSEARCH_APIS = `${API_DOCS}doc/elasticsearch/`;
  const ELASTICSEARCH_SERVERLESS_APIS = `${API_DOCS}doc/elasticsearch-serverless/`;
  const KIBANA_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/`;
  const KIBANA_APIS = `${API_DOCS}doc/kibana/`;
  const KIBANA_SERVERLESS_APIS = `{$API_DOCS}doc/serverless/`;
  const FLEET_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/fleet/${DOC_LINK_VERSION}/`;
  const INTEGRATIONS_DEV_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/integrations-developer/current/`;
  const OBSERVABILITY_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/`;
  const SECURITY_SOLUTION_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/`;
  const ENTERPRISE_SEARCH_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/enterprise-search/${DOC_LINK_VERSION}/`;
  const ESRE_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/esre/${DOC_LINK_VERSION}/`;
  const SERVERLESS_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/serverless/current/`;
  const SEARCH_LABS_REPO = `${ELASTIC_GITHUB}elasticsearch-labs/`;
  const isServerless = buildFlavor === 'serverless';

  return deepFreeze({
    settings: `${ELASTIC_DOCS}reference/kibana/configuration-reference`,
    elasticStackGetStarted: isServerless
      ? `${ELASTIC_DOCS}deploy-manage/deploy/elastic-cloud/serverless`
      : `${ELASTIC_DOCS}get-started`,
    apiReference: `${API_DOCS}`,
    upgrade: {
      upgradingStackOnPrem: `${ELASTIC_DOCS}deploy-manage/upgrade/deployment-or-cluster`,
      upgradingStackOnCloud: `${ELASTIC_DOCS}deploy-manage/upgrade/deployment-or-cluster`,
    },
    apm: {
      kibanaSettings: `${KIBANA_DOCS}apm-settings-in-kibana.html`,
      supportedServiceMaps: isServerless
        ? `${SERVERLESS_DOCS}observability-apm-service-map.html#observability-apm-service-map-supported-apm-agents`
        : `${KIBANA_DOCS}service-maps.html#service-maps-supported`,
      customLinks: isServerless
        ? `${SERVERLESS_DOCS}observability-apm-create-custom-links.html`
        : `${KIBANA_DOCS}custom-links.html`,
      droppedTransactionSpans: `${OBSERVABILITY_DOCS}apm-data-model-spans.html#apm-data-model-dropped-spans`,
      upgrading: `${OBSERVABILITY_DOCS}apm-upgrade.html`,
      metaData: `${OBSERVABILITY_DOCS}apm-data-model-metadata.html`,
      overview: `${OBSERVABILITY_DOCS}apm.html`,
      tailSamplingPolicies: isServerless
        ? `${SERVERLESS_DOCS}observability-apm-transaction-sampling.html`
        : `${OBSERVABILITY_DOCS}configure-tail-based-sampling.html`,
      elasticAgent: `${OBSERVABILITY_DOCS}/apm-upgrade-to-apm-integration.html`,
      storageExplorer: `${KIBANA_DOCS}storage-explorer.html`,
      spanCompression: isServerless
        ? `${SERVERLESS_DOCS}observability-apm-compress-spans.html`
        : `${OBSERVABILITY_DOCS}apm-data-model-spans.html#apm-spans-span-compression`,
      transactionSampling: isServerless
        ? `${SERVERLESS_DOCS}observability-apm-transaction-sampling.html`
        : `${OBSERVABILITY_DOCS}sampling.html`,
      indexLifecycleManagement: `${OBSERVABILITY_DOCS}apm-ilm-how-to.html`,
    },
    canvas: {
      guide: `${ELASTIC_DOCS}explore-analyze/visualize/canvas`,
    },
    cloud: {
      beatsAndLogstashConfiguration: `${ELASTIC_DOCS}deploy-manage/deploy/elastic-cloud/find-cloud-id`,
      indexManagement: `${ELASTIC_DOCS}manage-data/lifecycle/index-lifecycle-management/migrate-index-management`,
    },
    console: {
      guide: `${ELASTIC_DOCS}explore-analyze/query-filter/tools/console`,
    },
    dashboard: {
      guide: `${ELASTIC_DOCS}explore-analyze/dashboards`,
      drilldowns: `${ELASTIC_DOCS}explore-analyze/dashboards/drilldowns`,
      drilldownsTriggerPicker: `${ELASTIC_DOCS}explore-analyze/dashboards/drilldowns#create-url-drilldowns`,
      urlDrilldownTemplateSyntax: `${ELASTIC_DOCS}explore-analyze/dashboards/drilldowns#url-templating-language`,
      urlDrilldownVariables: `${ELASTIC_DOCS}explore-analyze/dashboards/drilldowns#url-template-variable`,
    },
    discover: {
      guide: `${ELASTIC_DOCS}explore-analyze/discover`,
      fieldStatistics: `${ELASTIC_DOCS}explore-analyze/discover/show-field-statistics`,
      fieldTypeHelp: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/field-data-types`,
      dateFieldTypeDocs: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/date`,
      dateFormatsDocs: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-date-format`,
      documentExplorer: `${ELASTIC_DOCS}explore-analyze/discover/document-explorer`,
    },
    filebeat: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}`,
      installation: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-installation-configuration.html`,
      configuration: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/configuring-howto-filebeat.html`,
      elasticsearchModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-module-elasticsearch.html`,
      elasticsearchOutput: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html`,
      startup: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-starting.html`,
      exportedFields: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/exported-fields.html`,
      suricataModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-module-suricata.html`,
      zeekModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-module-zeek.html`,
    },
    auditbeat: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/beats/auditbeat/${DOC_LINK_VERSION}`,
      auditdModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/auditbeat/${DOC_LINK_VERSION}/auditbeat-module-auditd.html`,
      systemModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/auditbeat/${DOC_LINK_VERSION}/auditbeat-module-system.html`,
    },
    enterpriseSearch: {
      aiSearchDoc: `${ESRE_DOCS}`,
      aiSearchHelp: `${ESRE_DOCS}help.html`,
      apiKeys: `${ELASTIC_DOCS}deploy-manage/api-keys/elasticsearch-api-keys`,
      behavioralAnalytics: `${ELASTICSEARCH_DOCS}behavioral-analytics-overview.html`,
      behavioralAnalyticsCORS: `${ELASTICSEARCH_DOCS}behavioral-analytics-cors.html`,
      behavioralAnalyticsEvents: `${ELASTICSEARCH_DOCS}behavioral-analytics-event.html`,
      buildConnector: `${ELASTIC_DOCS}reference/search-connectors/self-managed-connectors`,
      bulkApi: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-bulk`
        : `${ELASTICSEARCH_APIS}operation/operation-bulk`,
      configuration: `${ENTERPRISE_SEARCH_DOCS}configuration.html`,
      connectors: `${ELASTIC_DOCS}reference/search-connectors`,
      connectorsClientDeploy: `${ELASTIC_DOCS}reference/search-connectors/self-managed-connectors#es-connectors-deploy-connector-service`,
      connectorsMappings: `${ELASTIC_DOCS}reference/search-connectors/connectors-ui-in-kibana#es-connectors-usage-index-create-configure-existing-index`,
      connectorsAzureBlobStorage: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-azure-blob`,
      connectorsBox: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-box`,
      connectorsClients: `${ELASTIC_DOCS}reference/search-connectors`,
      connectorsConfluence: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-confluence`,
      connectorsDropbox: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-dropbox`,
      connectorsContentExtraction: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-content-extraction`,
      connectorsGithub: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-github`,
      connectorsGmail: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-gmail`,
      connectorsGoogleCloudStorage: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-google-cloud`,
      connectorsGoogleDrive: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-google-drive`,
      connectorsJira: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-jira`,
      connectorsMicrosoftSQL: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-ms-sql`,
      connectorsMongoDB: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-mongodb`,
      connectorsMySQL: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-mysql`,
      connectorsNative: `${ELASTIC_DOCS}reference/search-connectors#es-connectors-native`,
      connectorsNetworkDrive: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-network-drive`,
      connectorsNotion: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-notion`,
      connectorsOneDrive: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-onedrive`,
      connectorsOracle: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-oracle`,
      connectorsOutlook: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-outlook`,
      connectorsPostgreSQL: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-postgresql`,
      connectorsRedis: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-redis`,
      connectorsS3: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-s3`,
      connectorsSalesforce: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-salesforce`,
      connectorsServiceNow: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-servicenow`,
      connectorsSharepoint: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-sharepoint`,
      connectorsSharepointOnline: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-sharepoint-online`,
      connectorsSlack: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-slack`,
      connectorsTeams: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-teams`,
      connectorsZoom: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-zoom`,
      crawlerExtractionRules: `${ENTERPRISE_SEARCH_DOCS}crawler-extraction-rules.html`,
      crawlerManaging: `${ENTERPRISE_SEARCH_DOCS}crawler-managing.html`,
      crawlerOverview: `${ENTERPRISE_SEARCH_DOCS}crawler.html`,
      deployTrainedModels: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-deploy-models`,
      documentLevelSecurity: `${ELASTIC_DOCS}deploy-manage/users-roles/cluster-or-deployment-auth/controlling-access-at-document-field-level`,
      e5Model: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-e5`,
      elser: `${ELASTIC_DOCS}solutions/search/semantic-search/semantic-search-semantic-text`,
      engines: `${ENTERPRISE_SEARCH_DOCS}engines.html`,
      indexApi: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-create`
        : `${ELASTICSEARCH_APIS}operation/operation-create`,
      inferenceApiCreate: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-inference-put`
        : `${ELASTICSEARCH_APIS}operation/operation-inference-put`,
      inferenceApisConfigureChunking: `${ELASTIC_DOCS}explore-analyze/elastic-inference/inference-api#infer-chunking-config`,
      ingestionApis: `${ELASTIC_DOCS}solutions/search`,
      ingestPipelines: `${ELASTIC_DOCS}solutions/search/search-pipelines`,
      knnSearch: `${ELASTIC_DOCS}solutions/search/vector/knn`,
      knnSearchCombine: `${ELASTIC_DOCS}solutions/search/vector/knn#_combine_approximate_knn_with_other_features`,
      languageAnalyzers: `${ELASTIC_DOCS}reference/text-analysis/analysis-lang-analyzer`,
      languageClients: `${ENTERPRISE_SEARCH_DOCS}programming-language-clients.html`,
      licenseManagement: `${ENTERPRISE_SEARCH_DOCS}license-management.html`,
      machineLearningStart: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/nlp-end-to-end-tutorial`,
      mailService: `${ENTERPRISE_SEARCH_DOCS}mailer-configuration.html`,
      mlDocumentEnrichment: `${ELASTIC_DOCS}explore-analyze/machine-learning/machine-learning-in-kibana/inference-processing`,
      searchApplicationsTemplates: `${ELASTIC_DOCS}solutions/search/search-applications/search-application-api`,
      searchApplicationsSearchApi: `${ELASTIC_DOCS}solutions/search/search-applications/search-application-security`,
      searchApplications: `${ELASTIC_DOCS}solutions/search/search-applications`,
      searchApplicationsSearch: `${ELASTIC_DOCS}solutions/search/search-applications/search-application-client`,
      searchLabs: `${SEARCH_LABS_URL}`,
      searchLabsRepo: `${SEARCH_LABS_REPO}`,
      semanticSearch: `${ELASTIC_DOCS}solutions/search/semantic-search`,
      searchTemplates: `${ELASTIC_DOCS}solutions/search/search-templates`,
      semanticTextField: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/semantic-text`,
      start: `${ENTERPRISE_SEARCH_DOCS}start.html`,
      supportedNlpModels: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-model-ref`,
      syncRules: `${ELASTIC_DOCS}reference/search-connectors/es-sync-rules`,
      syncRulesAdvanced: `${ELASTIC_DOCS}reference/search-connectors/es-sync-rules#es-sync-rules-advanced`,
      trainedModels: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-trained-models`,
      textEmbedding: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-model-ref#ml-nlp-model-ref-text-embedding`,
      troubleshootSetup: `${ENTERPRISE_SEARCH_DOCS}troubleshoot-setup.html`,
      upgrade9x: `${ENTERPRISE_SEARCH_DOCS}upgrading-to-9-x.html`,
      usersAccess: `${ENTERPRISE_SEARCH_DOCS}users-access.html`,
    },
    metricbeat: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}`,
      configure: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/configuring-howto-metricbeat.html`,
      httpEndpoint: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/http-endpoint.html`,
      install: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-installation-configuration.html`,
      start: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}/metricbeat-starting.html`,
    },
    heartbeat: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/beats/heartbeat/${DOC_LINK_VERSION}`,
    },
    libbeat: {
      getStarted: `${ELASTIC_WEBSITE_URL}guide/en/beats/libbeat/${DOC_LINK_VERSION}/getting-started.html`,
    },
    logstash: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/logstash/${DOC_LINK_VERSION}`,
      inputElasticAgent: `${ELASTIC_WEBSITE_URL}guide/en/logstash/${DOC_LINK_VERSION}/plugins-inputs-elastic_agent.html`,
    },
    winlogbeat: {
      base: `${ELASTIC_WEBSITE_URL}guide/en/beats/winlogbeat/${DOC_LINK_VERSION}`,
    },
    aggs: {
      composite: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-composite-aggregation`,
      composite_missing_bucket: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-composite-aggregation#_missing_bucket`,
      date_histogram: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-datehistogram-aggregation`,
      date_range: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-daterange-aggregation`,
      date_format_pattern: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-daterange-aggregation#date-format-pattern`,
      filter: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-filter-aggregation`,
      filters: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-filters-aggregation`,
      geohash_grid: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation`,
      histogram: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-histogram-aggregation`,
      ip_range: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-iprange-aggregation`,
      range: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-range-aggregation`,
      significant_terms: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-significantterms-aggregation`,
      terms: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-terms-aggregation`,
      terms_doc_count_error: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-terms-aggregation#_per_bucket_document_count_error`,
      rare_terms: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-bucket-rare-terms-aggregation`,
      avg: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-avg-aggregation`,
      avg_bucket: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-avg-bucket-aggregation`,
      max_bucket: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-max-bucket-aggregation`,
      min_bucket: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-min-bucket-aggregation`,
      sum_bucket: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-sum-bucket-aggregation`,
      cardinality: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-cardinality-aggregation`,
      count: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-valuecount-aggregation`,
      cumulative_sum: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-sum-aggregation`,
      derivative: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-derivative-aggregation`,
      geo_bounds: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-geobounds-aggregation`,
      geo_centroid: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-geocentroid-aggregation`,
      max: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-max-aggregation`,
      median: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-percentile-aggregation`,
      min: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-min-aggregation`,
      moving_avg: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-movfn-aggregation`,
      percentile_ranks: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-percentile-rank-aggregation`,
      serial_diff: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-pipeline-serialdiff-aggregation`,
      std_dev: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-extendedstats-aggregation`,
      sum: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-sum-aggregation`,
      top_hits: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-top-hits-aggregation`,
      top_metrics: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-metrics-top-metrics`,
      change_point: `${ELASTIC_DOCS}reference/aggregations/search-aggregations-change-point-aggregation`,
    },
    runtimeFields: {
      overview: `${ELASTIC_DOCS}manage-data/data-store/mapping/runtime-fields`,
      mapping: `${ELASTIC_DOCS}manage-data/data-store/mapping/map-runtime-field`,
    },
    scriptedFields: {
      scriptFields: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/retrieve-selected-fields#script-fields`,
      scriptAggs: `${ELASTIC_DOCS}explore-analyze/query-filter/aggregations`,
      painless: `${ELASTIC_DOCS}explore-analyze/scripting/modules-scripting-painless`,
      painlessApi: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-scripts-painless-execute`
        : `${ELASTICSEARCH_APIS}operation/operation-scripts-painless-execute`,
      painlessLangSpec: `${ELASTIC_DOCS}reference/scripting-languages/painless/painless-language-specification`,
      painlessSyntax: `${ELASTIC_DOCS}reference/scripting-languages/painless/painless-language-specification`,
      painlessWalkthrough: `${ELASTIC_DOCS}reference/scripting-languages/painless/brief-painless-walkthrough`,
      painlessLanguage: `${ELASTIC_DOCS}reference/scripting-languages/painless/painless-language-specification`,
      luceneExpressions: `${ELASTIC_DOCS}explore-analyze/scripting/modules-scripting-expression`,
    },
    indexPatterns: {
      introduction: `${ELASTIC_DOCS}explore-analyze/find-and-organize/data-views`,
      fieldFormattersNumber: `${ELASTIC_DOCS}explore-analyze/numeral-formatting`,
      fieldFormattersString: `${ELASTIC_DOCS}explore-analyze/find-and-organize/data-views#string-field-formatters`,
      runtimeFields: `${ELASTIC_DOCS}explore-analyze/find-and-organize/data-views#runtime-fields`,
      migrateOffScriptedFields: `${ELASTIC_DOCS}explore-analyze/find-and-organize/data-views#migrate-off-scripted-fields`,
    },
    addData: `${KIBANA_DOCS}connect-to-elasticsearch.html`,
    kibana: {
      askElastic: `${ELASTIC_WEBSITE_URL}products/kibana/ask-elastic?blade=kibanaaskelastic`,
      createGithubIssue: `${ELASTIC_GITHUB}kibana/issues/new/choose`,
      feedback: `${ELASTIC_WEBSITE_URL}products/kibana/feedback?blade=kibanafeedback`,
      guide: `${ELASTIC_DOCS}get-started/the-stack`,
      autocompleteSuggestions: `${ELASTIC_DOCS}explore-analyze/query-filter/filtering#autocomplete-suggestions`,
      secureSavedObject: `${ELASTIC_DOCS}deploy-manage/security/secure-saved-objects`,
      xpackSecurity: `${ELASTIC_DOCS}deploy-manage/security`,
      restApis: isServerless ? `${KIBANA_SERVERLESS_APIS}` : `${KIBANA_APIS}`,
      upgradeNotes: `${ELASTIC_DOCS}release-notes/kibana/breaking-changes`,
    },
    upgradeAssistant: {
      overview: `${ELASTIC_DOCS}deploy-manage/upgrade/prepare-to-upgrade/upgrade-assistant`,
      batchReindex: `${KIBANA_APIS}group/endpoint-upgrade`,
      indexBlocks: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/index-block#index-block-settings`,
      remoteReindex: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-reindex`
        : `${ELASTICSEARCH_APIS}operation/operation-reindex`,
      unfreezeApi: `https://www.elastic.co/guide/en/elastic-stack/9.0/release-notes-elasticsearch-9.0.0.html#remove_unfreeze_rest_endpoint`,
      reindexWithPipeline: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-reindex`
        : `${ELASTICSEARCH_APIS}operation/operation-reindex`,
      logsDatastream: `${ELASTIC_DOCS}manage-data/data-store/data-streams/logs-data-stream`,
      usingLogsDbIndexModeWithESSecurity: `${ELASTIC_DOCS}solutions/security/detect-and-alert/using-logsdb-index-mode-with-elastic-security`,
      dataStreamReindex: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/reindex-data-stream#reindex-data-stream-api-settings`,
    },
    rollupJobs: `${ELASTIC_DOCS}manage-data/lifecycle/rollup/getting-started-kibana`,
    elasticsearch: {
      docsBase: `${ELASTIC_DOCS}solutions/search`,
      asyncSearch: `${ELASTIC_DOCS}solutions/search/async-search-api`,
      dataStreams: `${ELASTIC_DOCS}manage-data/data-store/data-streams`,
      deprecationLogging: `${ELASTIC_DOCS}deploy-manage/monitor/logging-configuration/update-elasticsearch-logging-levels#deprecation-logging`,
      createEnrichPolicy: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-enrich-put-policy`
        : `${ELASTICSEARCH_APIS}operation/operation-enrich-put-policy`,
      matchAllQuery: `${ELASTIC_DOCS}reference/query-languages/query-dsl/query-dsl-match-all-query`,
      enrichPolicies: `${ELASTIC_DOCS}manage-data/ingest/transform-enrich/data-enrichment#enrich-policy`,
      createIndex: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-create`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-create`,
      createIndexParameters: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-create#operation-indices-create-path`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-create#operation-indices-create-path`,
      gettingStarted: `${ELASTIC_DOCS}solutions/search/get-started`,
      hiddenIndices: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#multi-hidden`,
      ilm: `${ELASTIC_DOCS}manage-data/lifecycle/index-lifecycle-management`,
      ilmForceMerge: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge`,
      ilmFreeze: `${ELASTIC_WEBSITE_URL}blog/significantly-decrease-your-elasticsearch-heap-memory-usage`,
      ilmDelete: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-delete`,
      ilmPhaseTransitions: `${ELASTIC_DOCS}manage-data/lifecycle/index-lifecycle-management/index-lifecycle#ilm-phase-transitions`,
      ilmReadOnly: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-readonly`,
      ilmRollover: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-rollover`,
      ilmSearchableSnapshot: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-searchable-snapshot`,
      ilmSetPriority: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-set-priority`,
      ilmShrink: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-shrink`,
      ilmWaitForSnapshot: `${ELASTIC_DOCS}reference/elasticsearch/index-lifecycle-actions/ilm-wait-for-snapshot`,
      indexModules: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/index-modules`,
      indexSettings: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/index-modules`,
      dynamicIndexSettings: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/index-modules#dynamic-index-settings`,
      indexTemplates: `${ELASTIC_DOCS}manage-data/data-store/templates`,
      mapping: `${ELASTIC_DOCS}manage-data/data-store/mapping`,
      mappingAnalyzer: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/analyzer`,
      mappingCoerce: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/coerce`,
      mappingCopyTo: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/copy-to`,
      mappingDocValues: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/doc-values`,
      mappingDynamic: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/dynamic`,
      mappingDynamicFields: `${ELASTIC_DOCS}manage-data/data-store/mapping/dynamic-field-mapping`,
      mappingDynamicTemplates: `${ELASTIC_DOCS}manage-data/data-store/mapping/dynamic-templates`,
      mappingEagerGlobalOrdinals: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/eager-global-ordinals`,
      mappingEnabled: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/enabled`,
      mappingFieldData: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/text#fielddata-mapping-param`,
      mappingFieldDataEnable: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/text#before-enabling-fielddata`,
      mappingFieldDataFilter: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/text#field-data-filtering`,
      mappingFieldDataTypes: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/field-data-types`,
      mappingFormat: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-date-format`,
      mappingIgnoreAbove: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/ignore-above`,
      mappingIgnoreMalformed: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/ignore-malformed`,
      mappingIndex: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-index`,
      mappingIndexOptions: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/index-options`,
      mappingIndexPhrases: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/index-phrases`,
      mappingIndexPrefixes: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/index-prefixes`,
      mappingJoinFieldsPerformance: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/parent-join#_parent_join_and_performance`,
      mappingMeta: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-field-meta`,
      mappingMetaFields: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-meta-field`,
      mappingMultifields: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/multi-fields`,
      mappingNormalizer: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/normalizer`,
      mappingNorms: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/norms`,
      mappingNullValue: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/null-value`,
      mappingParameters: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-parameters`,
      mappingPositionIncrementGap: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/position-increment-gap`,
      mappingRankFeatureFields: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/rank-feature`,
      mappingRouting: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-routing-field`,
      mappingSettingsLimit: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/mapping-limit`,
      mappingSimilarity: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/similarity`,
      mappingSourceFields: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-source-field`,
      mappingSourceFieldsDisable: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-source-field#disable-source-field`,
      mappingSyntheticSourceFields: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-source-field#synthetic-source`,
      mappingStore: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/mapping-store`,
      mappingSubobjects: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/subobjects`,
      mappingTermVector: `${ELASTIC_DOCS}reference/elasticsearch/mapping-reference/term-vector`,
      mappingTypesRemoval: `${ELASTIC_DOCS}manage-data/data-store/mapping/removal-of-mapping-types`,
      migrateIndexAllocationFilters: `${ELASTIC_DOCS}manage-data/lifecycle/index-lifecycle-management/migrate-index-allocation-filters-to-node-roles`,
      migrationApiDeprecation: `${ELASTICSEARCH_APIS}operation/operation-migration-deprecations`,
      nodeRoles: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/node-settings#node-roles`,
      reindexDatastreamApiSettings: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/reindex-data-stream#reindex-data-stream-api-settings`,
      releaseHighlights: `${ELASTIC_DOCS}release-notes/elasticsearch`,
      latestReleaseHighlights: `${ELASTIC_DOCS}release-notes`,
      remoteClusters: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-self-managed`,
      remoteClustersProxy: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-self-managed#proxy-mode`,
      remoteClusersProxySettings: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-settings#remote-cluster-proxy-settings`,
      remoteClustersOnPremSetupTrustWithCert: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-cert`,
      remoteClustersOnPremSetupTrustWithApiKey: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-api-key`,
      remoteClustersCloudSetupTrust: `${ELASTIC_DOCS}deploy-manage/remote-clusters/ec-enable-ccs`,
      remoteClustersCreateCloudClusterApiKey: `${ELASTICSEARCH_APIS}operation/operation-security-create-cross-cluster-api-key`,
      remoteClustersOnPremPrerequisitesApiKey: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-api-key#remote-clusters-prerequisites-api-key`,
      remoteClustersOnPremSecurityApiKey: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-api-key#remote-clusters-security-api-key`,
      remoteClustersOnPremPrerequisitesCert: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-cert#remote-clusters-prerequisites-cert`,
      remoteClustersOnPremSecurityCert: `${ELASTIC_DOCS}deploy-manage/remote-clusters/remote-clusters-cert#remote-clusters-security-cert`,
      rollupMigratingToDownsampling: `${ELASTIC_DOCS}manage-data/lifecycle/rollup/migrating-from-rollup-to-downsampling`,
      rrf: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/reciprocal-rank-fusion`,
      scriptParameters: `${ELASTIC_DOCS}explore-analyze/scripting/modules-scripting-using#prefer-params`,
      secureCluster: `${ELASTIC_DOCS}deploy-manage/security`,
      shardAllocationSettings: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings#cluster-shard-allocation-settings`,
      sortSearch: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/sort-search-results`,
      tutorialUpdateExistingDataStream: `${ELASTIC_DOCS}manage-data/lifecycle/data-stream/tutorial-update-existing-data-stream`,
      transportSettings: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/networking-settings#common-network-settings`,
      typesRemoval: `${ELASTIC_DOCS}manage-data/data-store/mapping/removal-of-mapping-types`,
      setupUpgrade: `${ELASTIC_DOCS}deploy-manage/upgrade/deployment-or-cluster`,
      apiCompatibilityHeader: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#api-compatibility`,
      migrationGuide: `${ELASTIC_DOCS}release-notes/elasticsearch/breaking-changes`,
    },
    siem: {
      guide: `${ELASTIC_DOCS}solutions/security`,
      gettingStarted: `${ELASTIC_DOCS}solutions/security`,
      privileges: `${ELASTIC_DOCS}solutions/security/get-started/elastic-security-requirements`,
      ml: `${ELASTIC_DOCS}solutions/security/advanced-entity-analytics/anomaly-detection`,
      ruleChangeLog: `https://www.elastic.co/guide/en/security/current/prebuilt-rules-downloadable-updates.html`,
      detectionsReq: `${ELASTIC_DOCS}solutions/security/detect-and-alert/detections-requirements`,
      networkMap: `${ELASTIC_DOCS}solutions/security/explore/configure-network-map-data`,
      troubleshootGaps: `${ELASTIC_DOCS}troubleshoot/security/detection-rules#troubleshoot-gaps`,
      ruleApiOverview: isServerless
        ? `${KIBANA_APIS}group/endpoint-security-detections-api`
        : `${KIBANA_SERVERLESS_APIS}group/endpoint-security-detections-api`,
      configureAlertSuppression: `${ELASTIC_DOCS}solutions/security/detect-and-alert/suppress-detection-alerts#security-alert-suppression-configure-alert-suppression`,
    },
    server: {
      protocol: `${ELASTIC_DOCS}reference/kibana/configuration-reference/general-settings#server-protocol`,
      publicBaseUrl: `${ELASTIC_DOCS}reference/kibana/configuration-reference/general-settings#server-publicBaseUrl`,
    },
    logging: {
      enableDeprecationHttpDebugLogs: `${KIBANA_DOCS}logging-settings.html#enable-http-debug-logs`,
    },
    securitySolution: {
      artifactControl: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/configure-updates-for-protection-artifacts`,
      avcResults: `https://www.elastic.co/blog/elastic-security-av-comparatives-business-test`,
      bidirectionalIntegrations: `${ELASTIC_DOCS}solutions/security/endpoint-response-actions/third-party-response-actions`,
      trustedApps: `${ELASTIC_DOCS}solutions/security/manage-elastic-defend/trusted-applications`,
      eventFilters: `${ELASTIC_DOCS}solutions/security/manage-elastic-defend/event-filters`,
      blocklist: `${ELASTIC_DOCS}solutions/security/manage-elastic-defend/blocklist`,
      threatIntelInt: `${ELASTIC_DOCS}solutions/security/get-started/enable-threat-intelligence-integrations`,
      endpointArtifacts: `${ELASTIC_DOCS}solutions/security/manage-elastic-defend/optimize-elastic-defend`,
      eventMerging: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/configure-data-volume-for-elastic-endpoint`,
      policyResponseTroubleshooting: {
        full_disk_access: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/enable-access-for-macos-monterey#enable-fda-endpoint`,
        macos_system_ext: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/enable-access-for-macos-monterey#system-extension-endpoint`,
        linux_deadlock: `${ELASTIC_DOCS}troubleshoot/security/elastic-defend#linux-deadlock`,
      },
      packageActionTroubleshooting: {
        es_connection: `${ELASTIC_DOCS}troubleshoot/security/elastic-defend`,
      },
      responseActions: `${ELASTIC_DOCS}solutions/security/endpoint-response-actions`,
      configureEndpointIntegrationPolicy: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/configure-an-integration-policy-for-elastic-defend`,
      exceptions: {
        value_lists: `${ELASTIC_DOCS}solutions/security/detect-and-alert/create-manage-value-lists`,
      },
      privileges: `${ELASTIC_DOCS}solutions/security/configure-elastic-defend/elastic-defend-feature-privileges`,
      manageDetectionRules: `${ELASTIC_DOCS}solutions/security/detect-and-alert/manage-detection-rules`,
      createDetectionRules: `${ELASTIC_DOCS}solutions/security/detect-and-alert/create-detection-rule`,
      updatePrebuiltDetectionRules: `${ELASTIC_DOCS}solutions/security/detect-and-alert/install-manage-elastic-prebuilt-rules#update-prebuilt-rules`,
      prebuiltRuleCustomizationPromoBlog: isServerless
        ? '' // URL for Serverless to be added later, once the blog post is published. Issue: https://github.com/elastic/kibana/issues/209000
        : `https://www.elastic.co/blog/security-prebuilt-rules-editing`,
      createEsqlRuleType: `${ELASTIC_DOCS}solutions/security/detect-and-alert/create-detection-rule#create-esql-rule`,
      ruleUiAdvancedParams: `${ELASTIC_DOCS}solutions/security/detect-and-alert/create-detection-rule#rule-ui-advanced-params`,
      entityAnalytics: {
        riskScorePrerequisites: `${ELASTIC_DOCS}solutions/security/advanced-entity-analytics/entity-risk-scoring-requirements`,
        entityRiskScoring: `${ELASTIC_DOCS}solutions/security/advanced-entity-analytics/entity-risk-scoring`,
        assetCriticality: `${ELASTIC_DOCS}solutions/security/advanced-entity-analytics/asset-criticality`,
      },
      detectionEngineOverview: `${ELASTIC_DOCS}solutions/security/detect-and-alert`,
      aiAssistant: `${ELASTIC_DOCS}solutions/security/ai/ai-assistant`,
      signalsMigrationApi: isServerless
        ? `${KIBANA_APIS}group/endpoint-security-detections-api`
        : `${KIBANA_SERVERLESS_APIS}group/endpoint-security-detections-api`,
      siemMigrations: `${ELASTIC_DOCS}solutions/security/get-started/automatic-migration`,
      llmPerformanceMatrix: `${ELASTIC_DOCS}solutions/security/ai/large-language-model-performance-matrix`,
    },
    query: {
      eql: `${ELASTIC_DOCS}explore-analyze/query-filter/languages/eql`,
      kueryQuerySyntax: `${ELASTIC_DOCS}explore-analyze/query-filter/languages/kql`,
      luceneQuery: `${ELASTIC_DOCS}reference/query-languages/query-dsl/query-dsl-query-string-query`,
      luceneQuerySyntax: `${ELASTIC_DOCS}reference/query-languages/query-dsl/query-dsl-query-string-query#query-string-syntax`,
      percolate: `${ELASTIC_DOCS}reference/query-languages/query-dsl/query-dsl-percolate-query`,
      queryDsl: `${ELASTIC_DOCS}explore-analyze/query-filter/languages/querydsl`,
      queryESQL: `${ELASTIC_DOCS}explore-analyze/query-filter/languages/esql`,
      queryESQLExamples: `${ELASTIC_DOCS}explore-analyze/query-filter/languages/esql`,
    },
    search: {
      sessions: `${ELASTIC_DOCS}explore-analyze/discover/search-sessions`,
      sessionLimits: `${ELASTIC_DOCS}explore-analyze/discover/search-sessions#_limitations`,
    },
    date: {
      dateMath: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/common-options#date-math`,
      dateMathIndexNames: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#api-date-math-index-names`,
    },
    management: {
      dashboardSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-dashboard-settings`,
      indexManagement: isServerless
        ? `${ELASTIC_DOCS}manage-data/data-store/index-basics`
        : `${ELASTIC_DOCS}manage-data/lifecycle/index-lifecycle-management/index-management-in-kibana`,
      kibanaSearchSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-search-settings`,
      discoverSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-discover-settings`,
      rollupSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-rollups-settings`,
      visualizationSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-visualization-settings`,
      timelionSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-timelion-settings`,
      generalSettings: `${ELASTIC_DOCS}reference/kibana/advanced-settings#kibana-general-settings`,
      savedObjectsApiList: isServerless
        ? `${KIBANA_SERVERLESS_APIS}group/endpoint-saved-objects`
        : `${KIBANA_APIS}group/endpoint-saved-objects`,
      apiKeys: `${ELASTIC_DOCS}deploy-manage/api-keys/elasticsearch-api-keys`,
    },
    ml: {
      guide: `${ELASTIC_DOCS}explore-analyze/machine-learning`,
      aggregations: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-configuring-aggregation`,
      anomalyDetection: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection`,
      anomalyDetectionBucketSpan: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-bucket-span`,
      anomalyDetectionConfiguringCategories: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-configuring-categories`,
      anomalyDetectionCardinality: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-cardinality`,
      anomalyDetectionCreateJobs: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-create-job`,
      anomalyDetectionDetectors: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-detectors`,
      anomalyDetectionFunctions: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-functions`,
      anomalyDetectionInfluencers: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-influencers`,
      anomalyDetectionJobs: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-finding-anomalies`,
      anomalyDetectionJobResource: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ml-put-job`
        : `${ELASTICSEARCH_APIS}operation/operation-ml-put-job`,
      anomalyDetectionJobResourceAnalysisConfig: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ml-put-job`
        : `${ELASTICSEARCH_APIS}operation/operation-ml-put-job`,
      anomalyDetectionJobTips: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs`,
      anomalyDetectionScoreExplanation: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-explain`,
      alertingRules: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-configuring-alerts`,
      anomalyDetectionModelMemoryLimits: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-model-memory-limits`,
      calendars: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-calendars`,
      classificationEvaluation: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-dfa-classification#ml-dfanalytics-classification-evaluation`,
      customRules: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-ad-run-jobs#ml-ad-rules`,
      customUrls: `${ELASTIC_DOCS}explore-analyze/machine-learning/anomaly-detection/ml-configuring-url`,
      dataFrameAnalytics: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics`,
      dFAPrepareData: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-dfa-overview#prepare-transform-data`,
      dFAStartJob: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ml-start-data-frame-analytics`
        : `${ELASTICSEARCH_APIS}operation/operation-ml-start-data-frame-analytics`,
      dFACreateJob: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ml-put-data-frame-analytics`
        : `${ELASTICSEARCH_APIS}operation/operation-ml-put-data-frame-analytics`,
      featureImportance: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-feature-importance`,
      outlierDetectionRoc: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-dfa-finding-outliers#ml-dfanalytics-roc`,
      regressionEvaluation: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-dfa-regression#ml-dfanalytics-regression-evaluation`,
      classificationAucRoc: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-dfa-classification#ml-dfanalytics-class-aucroc`,
      setUpgradeMode: `${ELASTICSEARCH_APIS}operation/operation-ml-set-upgrade-mode`,
      trainedModels: `${ELASTIC_DOCS}explore-analyze/machine-learning/data-frame-analytics/ml-trained-models`,
      startTrainedModelsDeployment: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-deploy-model`,
      logsAnomalyDetectionConfigs: `${ELASTIC_DOCS}reference/data-analysis/machine-learning/ootb-ml-jobs-logs-ui`,
      metricsAnomalyDetectionConfigs: `${ELASTIC_DOCS}reference/data-analysis/machine-learning/ootb-ml-jobs-metrics-ui`,
      nlpElser: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-elser`,
      nlpE5: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-e5`,
      nlpImportModel: `${ELASTIC_DOCS}explore-analyze/machine-learning/nlp/ml-nlp-import-model`,
    },
    transforms: {
      guide: `${ELASTIC_DOCS}explore-analyze/transforms`,
      alertingRules: `${ELASTIC_DOCS}explore-analyze/transforms/transform-alerts`,
      overview: `${ELASTIC_DOCS}explore-analyze/transforms/transform-overview`,
    },
    visualize: {
      guide: `${ELASTIC_DOCS}explore-analyze/visualize`,
      lens: `${ELASTIC_WEBSITE_URL}what-is/kibana-lens`,
      lensPanels: `${ELASTIC_DOCS}explore-analyze/visualize/lens`,
      maps: `${ELASTIC_WEBSITE_URL}maps`,
      vega: `${ELASTIC_DOCS}explore-analyze/visualize/custom-visualizations-with-vega`,
      tsvbIndexPatternMode: `${ELASTIC_DOCS}explore-analyze/visualize/legacy-editors/tsvb#tsvb-data-view-mode`,
    },
    observability: {
      guide: isServerless
        ? `${SERVERLESS_DOCS}what-is-observability-serverless.html`
        : `${OBSERVABILITY_DOCS}index.html`,
      infrastructureThreshold: `${OBSERVABILITY_DOCS}infrastructure-threshold-alert.html`,
      logsThreshold: `${OBSERVABILITY_DOCS}logs-threshold-alert.html`,
      metricsThreshold: `${OBSERVABILITY_DOCS}metrics-threshold-alert.html`,
      customThreshold: isServerless
        ? `${SERVERLESS_DOCS}observability-create-custom-threshold-alert-rule.html`
        : `${OBSERVABILITY_DOCS}custom-threshold-alert.html`,
      monitorStatus: `${OBSERVABILITY_DOCS}monitor-status-alert.html`,
      monitorUptime: isServerless
        ? `${SERVERLESS_DOCS}observability-monitor-synthetics.html`
        : `${OBSERVABILITY_DOCS}monitor-uptime.html`,
      tlsCertificate: `${OBSERVABILITY_DOCS}tls-certificate-alert.html`,
      uptimeDurationAnomaly: `${OBSERVABILITY_DOCS}duration-anomaly-alert.html`,
      monitorLogs: isServerless
        ? `${SERVERLESS_DOCS}observability-discover-and-explore-logs.html`
        : `${OBSERVABILITY_DOCS}monitor-logs.html`,
      analyzeMetrics: isServerless
        ? `${SERVERLESS_DOCS}observability-infrastructure-monitoring.html`
        : `${OBSERVABILITY_DOCS}analyze-metrics.html`,
      monitorUptimeSynthetics: isServerless
        ? `${SERVERLESS_DOCS}observability-monitor-synthetics.html`
        : `${OBSERVABILITY_DOCS}monitor-uptime-synthetics.html`,
      userExperience: `${OBSERVABILITY_DOCS}user-experience.html`,
      createAlerts: isServerless
        ? `${SERVERLESS_DOCS}observability-alerting.html`
        : `${OBSERVABILITY_DOCS}create-alerts.html`,
      syntheticsAlerting: isServerless
        ? `${SERVERLESS_DOCS}observability-synthetics-settings.html#synthetics-settings-alerting`
        : `${OBSERVABILITY_DOCS}synthetics-settings.html#synthetics-settings-alerting`,
      syntheticsCommandReference: isServerless
        ? `${SERVERLESS_DOCS}observability-synthetics-configuration.html#synthetics-configuration-playwright-options`
        : `${OBSERVABILITY_DOCS}synthetics-configuration.html#synthetics-configuration-playwright-options`,
      syntheticsProjectMonitors: isServerless
        ? `${SERVERLESS_DOCS}observability-synthetics-get-started-project.html`
        : `${OBSERVABILITY_DOCS}synthetic-run-tests.html#synthetic-monitor-choose-project`,
      syntheticsMigrateFromIntegration: `${OBSERVABILITY_DOCS}synthetics-migrate-from-integration.html`,
      slo: isServerless
        ? `${SERVERLESS_DOCS}observability-slos.html`
        : `${OBSERVABILITY_DOCS}slo.html`,
      sloBurnRateRule: isServerless
        ? `${SERVERLESS_DOCS}observability-create-slo-burn-rate-alert-rule.html`
        : `${OBSERVABILITY_DOCS}slo-burn-rate-alert.html`,
      aiAssistant: `${OBSERVABILITY_DOCS}obs-ai-assistant.html`,
    },
    alerting: {
      guide: `${ELASTIC_DOCS}explore-analyze/alerts-cases/alerts/create-manage-rules`,
      actionTypes: `${ELASTIC_DOCS}reference/kibana/connectors-kibana`,
      apmRulesErrorCount: `${ELASTIC_DOCS}solutions/observability/incident-management/create-an-error-count-threshold-rule`,
      apmRulesTransactionDuration: `${ELASTIC_DOCS}solutions/observability/incident-management/create-latency-threshold-rule`,
      apmRulesTransactionError: `${ELASTIC_DOCS}solutions/observability/incident-management/create-failed-transaction-rate-threshold-rule`,
      apmRulesAnomaly: `${ELASTIC_DOCS}solutions/observability/incident-management/create-an-apm-anomaly-rule`,
      authorization: `${KIBANA_DOCS}alerting-setup.html#alerting-authorization`,
      emailAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/email-action-type`,
      emailActionConfig: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/email-action-type`,
      emailExchangeClientSecretConfig: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/email-action-type#exchange-client-secret`,
      emailExchangeClientIdConfig: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/email-action-type#exchange-client-tenant-id`,
      generalSettings: `${ELASTIC_DOCS}reference/kibana/configuration-reference/alerting-settings#general-alert-action-settings`,
      indexAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/index-action-type`,
      esQuery: `${ELASTIC_DOCS}explore-analyze/alerts-cases/alerts/rule-type-es-query`,
      indexThreshold: `${ELASTIC_DOCS}explore-analyze/alerts-cases/alerts/rule-type-index-threshold`,
      maintenanceWindows: `${ELASTIC_DOCS}explore-analyze/alerts-cases/alerts/maintenance-windows`,
      pagerDutyAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/pagerduty-action-type`,
      preconfiguredConnectors: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/pre-configured-connectors`,
      preconfiguredAlertHistoryConnector: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/pre-configured-connectors#preconfigured-connector-alert-history`,
      serviceNowAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/servicenow-action-type#configuring-servicenow`,
      serviceNowSIRAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/servicenow-sir-action-type`,
      setupPrerequisites: `${ELASTIC_DOCS}explore-analyze/alerts-cases/alerts/alerting-setup#alerting-prerequisites`,
      slackAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/slack-action-type#configuring-slack-webhook`,
      slackApiAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/slack-action-type#configuring-slack-web-api`,
      teamsAction: `${ELASTIC_DOCS}reference/kibana/connectors-kibana/teams-action-type#configuring-teams`,
      connectors: `${ELASTIC_DOCS}reference/kibana/connectors-kibana`,
    },
    taskManager: {
      healthMonitoring: `${ELASTIC_DOCS}deploy-manage/monitor/kibana-task-manager-health-monitoring`,
    },
    maps: {
      connectToEms: `${ELASTIC_DOCS}explore-analyze/visualize/maps/maps-connect-to-ems`,
      guide: `${ELASTIC_DOCS}explore-analyze/visualize/maps`,
      importGeospatialPrivileges: `${ELASTIC_DOCS}explore-analyze/visualize/maps/import-geospatial-data#import-geospatial-privileges`,
      gdalTutorial: `${ELASTIC_WEBSITE_URL}blog/how-to-ingest-geospatial-data-into-elasticsearch-with-gdal`,
      termJoinsExample: `${ELASTIC_DOCS}explore-analyze/visualize/maps/terms-join#_example_term_join`,
    },
    monitoring: {
      alertsKibana: `${KIBANA_DOCS}kibana-alerts.html`,
      alertsKibanaCpuThreshold: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-cpu-threshold`,
      alertsKibanaDiskThreshold: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-disk-usage-threshold`,
      alertsKibanaJvmThreshold: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-jvm-memory-threshold`,
      alertsKibanaMissingData: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-missing-monitoring-data`,
      alertsKibanaThreadpoolRejections: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-thread-pool-rejections`,
      alertsKibanaCCRReadExceptions: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-ccr-read-exceptions`,
      alertsKibanaLargeShardSize: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-large-shard-size`,
      alertsKibanaClusterAlerts: `${KIBANA_DOCS}kibana-alerts.html#kibana-alerts-cluster-alerts`,
      metricbeatBlog: `${ELASTIC_WEBSITE_URL}blog/external-collection-for-elastic-stack-monitoring-is-now-available-via-metricbeat`,
      monitorElasticsearch: `${ELASTICSEARCH_DOCS}configuring-metricbeat.html`,
      monitorKibana: `${KIBANA_DOCS}monitoring-metricbeat.html`,
      monitorLogstash: `${ELASTIC_WEBSITE_URL}guide/en/logstash/${DOC_LINK_VERSION}/monitoring-with-metricbeat.html`,
      troubleshootKibana: `${KIBANA_DOCS}monitor-troubleshooting.html`,
    },
    reporting: {
      cloudMinimumRequirements: `${ELASTIC_DOCS}explore-analyze/report-and-share#_embed_outside_of_kib`,
      browserSystemDependencies: `${ELASTIC_DOCS}deploy-manage/kibana-reporting-configuration#install-reporting-packages`,
      browserSandboxDependencies: `${ELASTIC_DOCS}explore-analyze/report-and-share/reporting-troubleshooting-pdf#reporting-troubleshooting-sandbox-dependency`,
    },
    security: {
      apiKeyServiceSettings: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/security-settings#api-key-service-settings`,
      clusterPrivileges: `${ELASTIC_DOCS}reference/elasticsearch/security-privileges#privileges-list-cluster`,
      definingRoles: `${ELASTIC_DOCS}deploy-manage/users-roles/cluster-or-deployment-auth/defining-roles`,
      elasticsearchSettings: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/security-settings`,
      elasticsearchEnableSecurity: `${ELASTIC_DOCS}deploy-manage/deploy/self-managed/installing-elasticsearch`,
      elasticsearchEnableApiKeys: `${ELASTIC_DOCS}reference/elasticsearch/configuration-reference/security-settings#api-key-service-settings`,
      indicesPrivileges: `${ELASTIC_DOCS}reference/elasticsearch/security-privileges#privileges-list-indices`,
      kibanaTLS: `${ELASTIC_DOCS}deploy-manage/security/set-up-basic-security#encrypt-internode-communication`,
      kibanaPrivileges: `${ELASTIC_DOCS}deploy-manage/users-roles/cluster-or-deployment-auth/kibana-privileges`,
      mappingRoles: `${ELASTIC_DOCS}deploy-manage/users-roles/cluster-or-deployment-auth/mapping-users-groups-to-roles`,
      mappingRolesFieldRules: `${ELASTIC_DOCS}deploy-manage/users-roles/cluster-or-deployment-auth/role-mapping-resources#mapping-roles-rule-field`,
      runAsPrivilege: `${ELASTIC_DOCS}reference/elasticsearch/security-privileges#_run_as_privilege`,
      enableElasticSearchSecurityFeatures: `${ELASTIC_DOCS}deploy-manage/security/set-up-minimal-security#_enable_es_security_features`,
    },
    spaces: {
      kibanaLegacyUrlAliases: `${ELASTIC_DOCS}extend/kibana/legacy-url-aliases`,
      kibanaDisableLegacyUrlAliasesApi: `${KIBANA_APIS}operation/operation-post-spaces-disable-legacy-url-aliases`,
    },
    watcher: {
      jiraAction: `${ELASTIC_DOCS}explore-analyze/alerts-cases/watcher/actions-jira`,
      pagerDutyAction: `${ELASTIC_DOCS}explore-analyze/alerts-cases/watcher/actions-pagerduty`,
      slackAction: `${ELASTIC_DOCS}explore-analyze/alerts-cases/watcher/actions-slack`,
      ui: `${ELASTIC_DOCS}explore-analyze/alerts-cases/watcher`,
    },
    ccs: {
      guide: `${ELASTIC_DOCS}solutions/search/cross-cluster-search`,
      skippingDisconnectedClusters: `${ELASTIC_DOCS}solutions/search/cross-cluster-search#skip-unavailable-clusters`,
    },
    apis: {
      bulkIndexAlias: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-update-aliases`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-update-aliases`,
      indexStats: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-update-aliases`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-stats`,
      byteSizeUnits: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#byte-units`,
      createAutoFollowPattern: `${ELASTICSEARCH_APIS}operation/operation-ccr-put-auto-follow-pattern`,
      createFollower: `${ELASTICSEARCH_APIS}operation/operation-ccr-follow`,
      createIndex: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-create`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-create`,
      createSnapshotLifecyclePolicy: `${ELASTICSEARCH_APIS}operation/operation-slm-put-lifecycle`,
      createRoleMapping: `${ELASTICSEARCH_APIS}operation/operation-security-put-role-mapping`,
      createRoleMappingTemplates: `${ELASTICSEARCH_APIS}operation/operation-security-put-role-mapping`,
      createRollupJobsRequest: `${ELASTICSEARCH_APIS}operation/operation-rollup-put-job#operation-rollup-put-job-body-application-json`,
      createApiKey: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-security-create-api-key`
        : `${ELASTICSEARCH_APIS}operation/operation-security-create-api-key`,
      createPipeline: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ingest-put-pipeline`
        : `${ELASTICSEARCH_APIS}operation/operation-ingest-put-pipeline`,
      createTransformRequest: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-transform-put-transform`
        : `${ELASTICSEARCH_APIS}operation/operation-transform-put-transform`,
      cronExpressions: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#api-cron-expressions`,
      executeWatchActionModes: `${ELASTICSEARCH_APIS}operation/operation-watcher-execute-watch#operation-watcher-execute-watch-body-application-json`,
      indexExists: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-indices-exists`
        : `${ELASTICSEARCH_APIS}operation/operation-indices-exists`,
      inferTrainedModel: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ml-infer-trained-model`
        : `${ELASTICSEARCH_APIS}operation/operation-ml-infer-trained-model`,
      multiSearch: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-msearch`
        : `${ELASTICSEARCH_APIS}operation/operation-msearch`,
      openIndex: `${ELASTICSEARCH_APIS}operation/operation-indices-open`,
      putComponentTemplate: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-cluster-put-component-template`
        : `${ELASTICSEARCH_APIS}operation/operation-cluster-put-component-template`,
      painlessExecute: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-scripts-painless-execute`
        : `${ELASTICSEARCH_APIS}operation/operation-scripts-painless-execute`,
      painlessExecuteAPIContexts: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-scripts-painless-execute#operation-scripts-painless-execute-body-application-json`
        : `${ELASTICSEARCH_APIS}operation/operation-scripts-painless-execute#operation-scripts-painless-execute-body-application-json`,
      putComponentTemplateMetadata: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-cluster-put-component-template#operation-cluster-put-component-template-body-application-json-_meta`
        : `${ELASTICSEARCH_APIS}operation/operation-cluster-put-component-template#operation-cluster-put-component-template-body-application-json-_meta`,
      putEnrichPolicy: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-enrich-put-policy`
        : `${ELASTICSEARCH_APIS}operation/operation-enrich-put-policy`,
      putIndexTemplateV1: `${ELASTICSEARCH_APIS}operation/operation-indices-put-template`,
      putSnapshotLifecyclePolicy: `${ELASTICSEARCH_APIS}operation/operation-slm-put-lifecycle`,
      putWatch: `${ELASTICSEARCH_APIS}operation/operation-watcher-put-watch`,
      restApis: isServerless ? `${ELASTICSEARCH_SERVERLESS_APIS}` : `${ELASTICSEARCH_APIS}`,
      searchPreference: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-search#operation-search-preference`
        : `${ELASTICSEARCH_APIS}operation/operation-search#operation-search-preference`,
      securityApis: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}group/endpoint-security`
        : `${ELASTICSEARCH_APIS}group/endpoint-security`,
      simulatePipeline: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-ingest-simulate`
        : `${ELASTICSEARCH_APIS}operation/operation-ingest-simulate`,
      tasks: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}group/endpoint-tasks`
        : `${ELASTICSEARCH_APIS}group/endpoint-tasks`,
      timeUnits: `${ELASTIC_DOCS}reference/elasticsearch/rest-apis/api-conventions#time-units`,
      updateTransform: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-transform-update-transform`
        : `${ELASTICSEARCH_APIS}operation/operation-transform-update-transform`,
    },
    plugins: {
      azureRepo: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/azure-repository`,
      gcsRepo: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/google-cloud-storage-repository`,
      hdfsRepo: `${ELASTIC_DOCS}reference/elasticsearch/plugins/repository-hdfs`,
      ingestAttachment: `${ELASTIC_DOCS}reference/enrich-processor/attachment`,
      s3Repo: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/s3-repository`,
      snapshotRestoreRepos: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/self-managed`,
      mapperSize: `${ELASTIC_DOCS}reference/elasticsearch/plugins/mapper-size-usage`,
    },
    snapshotRestore: {
      guide: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore`,
      changeIndexSettings: `${ELASTIC_DOCS}reference/elasticsearch/index-settings/index-modules`,
      createSnapshot: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/create-snapshots`,
      getSnapshot: `${ELASTICSEARCH_APIS}operation/operation-snapshot-get`,
      registerSharedFileSystem: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/shared-file-system-repository#filesystem-repository-settings`,
      registerSourceOnly: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/source-only-repository#source-only-repository-settings`,
      registerUrl: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/read-only-url-repository#read-only-url-repository-settings`,
      restoreSnapshot: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/restore-snapshot`,
      restoreSnapshotApi: `${ELASTICSEARCH_APIS}operation/operation-snapshot-restore`,
      searchableSnapshotSharedCache: `${ELASTIC_DOCS}deploy-manage/tools/snapshot-and-restore/searchable-snapshots#searchable-snapshots-shared-cache`,
      slmStart: `${ELASTICSEARCH_APIS}operation/operation-slm-start`,
    },
    ingest: {
      append: `${ELASTICSEARCH_DOCS}append-processor.html`,
      attachment: `${ELASTIC_DOCS}reference/enrich-processor/attachment`,
      bytes: `${ELASTICSEARCH_DOCS}bytes-processor.html`,
      circle: `${ELASTICSEARCH_DOCS}ingest-circle-processor.html`,
      convert: `${ELASTICSEARCH_DOCS}convert-processor.html`,
      csv: `${ELASTICSEARCH_DOCS}csv-processor.html`,
      date: `${ELASTICSEARCH_DOCS}date-processor.html`,
      dateIndexName: `${ELASTICSEARCH_DOCS}date-index-name-processor.html`,
      dissect: `${ELASTICSEARCH_DOCS}dissect-processor.html`,
      dissectKeyModifiers: `${ELASTICSEARCH_DOCS}dissect-processor.html#dissect-key-modifiers`,
      dotExpander: `${ELASTICSEARCH_DOCS}dot-expand-processor.html`,
      drop: `${ELASTICSEARCH_DOCS}drop-processor.html`,
      enrich: `${ELASTICSEARCH_DOCS}ingest-enriching-data.html`,
      fail: `${ELASTICSEARCH_DOCS}fail-processor.html`,
      foreach: `${ELASTICSEARCH_DOCS}foreach-processor.html`,
      geoIp: `${ELASTICSEARCH_DOCS}geoip-processor.html`,
      geoMatch: `${ELASTICSEARCH_DOCS}geo-match-enrich-policy-type.html`,
      grok: `${ELASTICSEARCH_DOCS}grok-processor.html`,
      gsub: `${ELASTICSEARCH_DOCS}gsub-processor.html`,
      htmlString: `${ELASTICSEARCH_DOCS}htmlstrip-processor.html`,
      inference: `${ELASTICSEARCH_DOCS}inference-processor.html`,
      inferenceClassification: `${ELASTICSEARCH_DOCS}inference-processor.html#inference-processor-classification-opt`,
      inferenceRegression: `${ELASTICSEARCH_DOCS}inference-processor.html#inference-processor-regression-opt`,
      join: `${ELASTICSEARCH_DOCS}join-processor.html`,
      json: `${ELASTICSEARCH_DOCS}json-processor.html`,
      kv: `${ELASTICSEARCH_DOCS}kv-processor.html`,
      lowercase: `${ELASTICSEARCH_DOCS}lowercase-processor.html`,
      pipeline: `${ELASTICSEARCH_DOCS}pipeline-processor.html`,
      pipelines: isServerless
        ? `${SERVERLESS_DOCS}ingest-pipelines.html`
        : `${ELASTICSEARCH_DOCS}ingest.html`,
      csvPipelines: `${ELASTIC_WEBSITE_URL}guide/en/ecs/${ECS_VERSION}/ecs-converting.html`,
      pipelineFailure: `${ELASTICSEARCH_DOCS}ingest.html#handling-pipeline-failures`,
      processors: `${ELASTICSEARCH_DOCS}processors.html`,
      arrayOrJson: `${ELASTICSEARCH_DOCS}processors.html#ingest-process-category-array-json-handling`,
      dataEnrichment: `${ELASTICSEARCH_DOCS}processors.html#ingest-process-category-data-enrichment`,
      dataFiltering: `${ELASTICSEARCH_DOCS}processors.html#ingest-process-category-data-filtering`,
      dataTransformation: `${ELASTICSEARCH_DOCS}processors.html#ingest-process-category-data-transformation`,
      pipelineHandling: `${ELASTICSEARCH_DOCS}processors.html#ingest-process-category-pipeline-handling`,
      remove: `${ELASTICSEARCH_DOCS}remove-processor.html`,
      rename: `${ELASTICSEARCH_DOCS}rename-processor.html`,
      script: `${ELASTICSEARCH_DOCS}script-processor.html`,
      set: `${ELASTICSEARCH_DOCS}set-processor.html`,
      setSecurityUser: `${ELASTICSEARCH_DOCS}ingest-node-set-security-user-processor.html`,
      sort: `${ELASTICSEARCH_DOCS}sort-processor.html`,
      split: `${ELASTICSEARCH_DOCS}split-processor.html`,
      trim: `${ELASTICSEARCH_DOCS}trim-processor.html`,
      uppercase: `${ELASTICSEARCH_DOCS}uppercase-processor.html`,
      uriParts: `${ELASTICSEARCH_DOCS}uri-parts-processor.html`,
      urlDecode: `${ELASTICSEARCH_DOCS}urldecode-processor.html`,
      userAgent: `${ELASTICSEARCH_DOCS}user-agent-processor.html`,
    },
    fleet: {
      guide: `${FLEET_DOCS}index.html`,
      fleetServer: `${FLEET_DOCS}fleet-server.html`,
      fleetServerAddFleetServer: `${FLEET_DOCS}add-a-fleet-server.html`,
      settings: `${FLEET_DOCS}fleet-settings.html`,
      kafkaSettings: `${FLEET_DOCS}kafka-output-settings.html`,
      kafkaOutputTopicsSettings: `${FLEET_DOCS}kafka-output-settings.html#_topics_settings`,
      logstashSettings: `${FLEET_DOCS}ls-output-settings.html`,
      esSettings: `${FLEET_DOCS}es-output-settings.html`,
      settingsFleetServerHostSettings: `${FLEET_DOCS}fleet-settings.html#fleet-server-hosts-setting`,
      settingsFleetServerProxySettings: `${KIBANA_DOCS}fleet-settings-kb.html#fleet-data-visualizer-settings`,
      troubleshooting: `${FLEET_DOCS}fleet-troubleshooting.html`,
      elasticAgent: `${FLEET_DOCS}elastic-agent-installation.html`,
      beatsAgentComparison: `${FLEET_DOCS}beats-agent-comparison.html`,
      datastreams: `${FLEET_DOCS}data-streams.html`,
      datastreamsILM: `${FLEET_DOCS}data-streams.html#data-streams-ilm`,
      datastreamsNamingScheme: `${FLEET_DOCS}data-streams.html#data-streams-naming-scheme`,
      datastreamsManualRollover: `${ELASTICSEARCH_DOCS}use-a-data-stream.html#manually-roll-over-a-data-stream`,
      datastreamsTSDS: `${ELASTICSEARCH_DOCS}tsds.html`,
      datastreamsTSDSMetrics: `${ELASTICSEARCH_DOCS}tsds.html#time-series-metric`,
      datastreamsDownsampling: `${ELASTICSEARCH_DOCS}downsampling.html`,
      installElasticAgent: `${FLEET_DOCS}install-fleet-managed-elastic-agent.html`,
      installElasticAgentStandalone: `${FLEET_DOCS}install-standalone-elastic-agent.html`,
      grantESAccessToStandaloneAgents: `${FLEET_DOCS}grant-access-to-elasticsearch.html`,
      upgradeElasticAgent: `${FLEET_DOCS}upgrade-elastic-agent.html`,
      learnMoreBlog: `${ELASTIC_WEBSITE_URL}blog/elastic-agent-and-fleet-make-it-easier-to-integrate-your-systems-with-elastic`,
      apiKeysLearnMore: isServerless
        ? `${SERVERLESS_DOCS}api-keys.html`
        : `${KIBANA_DOCS}api-keys.html`,
      onPremRegistry: `${FLEET_DOCS}air-gapped.html`,
      packageSignatures: `${FLEET_DOCS}package-signatures.html`,
      secureLogstash: `${FLEET_DOCS}secure-logstash-connections.html`,
      agentPolicy: `${FLEET_DOCS}agent-policy.html`,
      agentlessIntegrations: `${ELASTIC_DOCS}solutions/security/get-started/agentless-integrations`,
      api: `${FLEET_DOCS}fleet-api-docs.html`,
      uninstallAgent: `${SECURITY_SOLUTION_DOCS}uninstall-agent.html`,
      installAndUninstallIntegrationAssets: `${FLEET_DOCS}install-uninstall-integration-assets.html`,
      elasticAgentInputConfiguration: `${FLEET_DOCS}elastic-agent-input-configuration.html`,
      policySecrets: `${FLEET_DOCS}agent-policy.html#agent-policy-secret-values`,
      remoteESOoutput: `${FLEET_DOCS}remote-elasticsearch-output.html`,
      performancePresets: `${FLEET_DOCS}es-output-settings.html#es-output-settings-performance-tuning-settings`,
      scalingKubernetesResourcesAndLimits: `${FLEET_DOCS}scaling-on-kubernetes.html#_specifying_resources_and_limits_in_agent_manifests`,
      roleAndPrivileges: `${FLEET_DOCS}fleet-roles-and-privileges.html`,
      proxiesSettings: `${FLEET_DOCS}fleet-agent-proxy-support.html`,
      unprivilegedMode: `${FLEET_DOCS}elastic-agent-unprivileged.html#unprivileged-change-mode`,
      httpMonitoring: `${FLEET_DOCS}agent-policy.html#change-policy-enable-agent-monitoring`,
      agentLevelLogging: `${FLEET_DOCS}monitor-elastic-agent.html#change-logging-level`,
    },
    integrationDeveloper: {
      upload: `${INTEGRATIONS_DEV_DOCS}upload-a-new-integration.html`,
    },
    ecs: {
      guide: `${ELASTIC_DOCS}reference/ecs`,
      dataStreams: `${ELASTIC_DOCS}reference/ecs/ecs-data_stream`,
    },
    clients: {
      /** Changes to these URLs must also be synched in src/platform/plugins/shared/custom_integrations/server/language_clients/index.ts */
      guide: `${ELASTIC_DOCS}reference/elasticsearch-clients`,
      goConnecting: `${ELASTIC_DOCS}reference/elasticsearch/clients/go/connecting`,
      goGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/go/getting-started`,
      goIndex: `${ELASTIC_DOCS}reference/elasticsearch/clients/go`,
      goOverview: `${ELASTIC_DOCS}reference/elasticsearch/clients/go`,
      javaBasicAuthentication: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/8.18/_basic_authentication.html`,
      javaIndex: `${ELASTIC_DOCS}reference/elasticsearch/clients/java`,
      javaInstallation: `${ELASTIC_DOCS}reference/elasticsearch/clients/java/installation`,
      javaIntroduction: `${ELASTIC_DOCS}reference/elasticsearch/clients/java`,
      javaRestLow: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/8.18/java-rest-low.html`,
      jsAdvancedConfig: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/advanced-config`,
      jsApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/api-reference`,
      jsBasicConfig: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/basic-config`,
      jsClientConnecting: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/connecting`,
      jsIntro: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript`,
      netGuide: `${ELASTIC_DOCS}reference/elasticsearch/clients/dotnet`,
      netIntroduction: `${ELASTIC_DOCS}reference/elasticsearch/clients/dotnet`,
      netNest: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/7.17/nest.html`,
      netSingleNode: `${ELASTIC_DOCS}reference/elasticsearch/clients/dotnet/connecting#single-node`,
      phpConfiguration: `${ELASTIC_DOCS}reference/elasticsearch/clients/php/configuration`,
      phpConnecting: `${ELASTIC_DOCS}reference/elasticsearch/clients/php/connecting`,
      phpInstallation: `${ELASTIC_DOCS}reference/elasticsearch/clients/php/installation`,
      phpGuide: `${ELASTIC_DOCS}reference/elasticsearch/clients/php`,
      phpOverview: `${ELASTIC_DOCS}reference/elasticsearch/clients/php`,
      pythonAuthentication: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/connecting#authentication`,
      pythonConfig: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/configuration`,
      pythonConnecting: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/connecting`,
      pythonGuide: `${ELASTIC_DOCS}reference/elasticsearch/clients/python`,
      pythonOverview: `${ELASTIC_DOCS}reference/elasticsearch/clients/python`,
      rubyAuthentication: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/connecting#client-auth`,
      rubyAdvancedConfig: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/advanced-config`,
      rubyBasicConfig: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/basic-config`,
      rubyExamples: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/examples`,
      rubyOverview: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby`,
      rustGuide: `${ELASTIC_DOCS}reference/elasticsearch/clients/rust`,
      rustOverview: `${ELASTIC_DOCS}reference/elasticsearch/clients/rust`,
      eland: `${ELASTIC_DOCS}reference/elasticsearch/clients/eland`,
    },
    endpoints: {
      troubleshooting: `${SECURITY_SOLUTION_DOCS}ts-management.html#ts-endpoints`,
    },
    legal: {
      privacyStatement: `${ELASTIC_WEBSITE_URL}legal/product-privacy-statement`,
      generalPrivacyStatement: `${ELASTIC_WEBSITE_URL}legal/privacy-statement`,
      termsOfService: `${ELASTIC_WEBSITE_URL}legal/elastic-cloud-account-terms`,
      dataUse: `${ELASTIC_WEBSITE_URL}legal/privacy-statement#how-we-use-the-information`,
    },
    kibanaUpgradeSavedObjects: {
      resolveMigrationFailures: `${ELASTIC_DOCS}troubleshoot/kibana/migration-failures`,
      repeatedTimeoutRequests: `${ELASTIC_DOCS}troubleshoot/kibana/migration-failures#_repeated_time_out_requests_that_eventually_fail`,
      routingAllocationDisabled: `${ELASTIC_DOCS}troubleshoot/kibana/migration-failures#routing-allocation-disabled`,
      clusterShardLimitExceeded: `${ELASTIC_DOCS}troubleshoot/kibana/migration-failures#cluster-shard-limit-exceeded`,
    },
    searchUI: {
      appSearch: `${ELASTIC_DOCS}reference/search-ui/tutorials-app-search`,
      elasticsearch: `${ELASTIC_DOCS}reference/search-ui/tutorials-elasticsearch`,
    },
    serverlessClients: {
      clientLib: `${ELASTIC_DOCS}reference/elasticsearch-clients`,
      goApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/go/getting-started`,
      goGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/go/getting-started`,
      httpApis: `${ELASTIC_DOCS}deploy-manage/deploy/elastic-cloud/tools-apis`,
      httpApiReferences: `${ELASTIC_DOCS}deploy-manage/deploy/elastic-cloud/tools-apis`,
      jsApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/getting-started`,
      jsGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/javascript/getting-started`,
      phpApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/php/getting-started`,
      phpGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/php/getting-started`,
      pythonApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/getting-started`,
      pythonGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/getting-started`,
      pythonReferences: `${ELASTIC_DOCS}reference/elasticsearch/clients/python/getting-started`,
      rubyApiReference: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/getting-started`,
      rubyGettingStarted: `${ELASTIC_DOCS}reference/elasticsearch/clients/ruby/getting-started`,
    },
    serverlessSearch: {
      integrations: `${ELASTIC_DOCS}manage-data/ingest`,
      integrationsLogstash: `${ELASTIC_DOCS}reference/logstash`,
      integrationsBeats: `${ELASTIC_DOCS}reference/beats`,
      integrationsConnectorClient: `${ELASTIC_DOCS}reference/search-connectors`,
      integrationsConnectorClientAvailableConnectors: `${ELASTIC_DOCS}reference/search-connectors#available-connectors`,
      integrationsConnectorClientRunFromSource: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-run-from-source`,
      integrationsConnectorClientRunWithDocker: `${ELASTIC_DOCS}reference/search-connectors/es-connectors-run-from-docker`,
      gettingStartedExplore: `${ELASTIC_DOCS}solutions/search/get-started`,
      gettingStartedIngest: `${ELASTIC_DOCS}solutions/search/ingest-for-search`,
      gettingStartedSearch: `${ELASTIC_DOCS}solutions/search/search-approaches`,
    },
    serverlessSecurity: {
      apiKeyPrivileges: `${ELASTIC_DOCS}deploy-manage/api-keys/serverless-project-api-keys#api-keys-restrict-privileges`,
    },
    synthetics: {
      featureRoles: isServerless
        ? `${SERVERLESS_DOCS}observability-synthetics-feature-roles.html`
        : `${OBSERVABILITY_DOCS}synthetics-feature-roles.html`,
    },
    telemetry: {
      settings: `${ELASTIC_DOCS}reference/kibana/configuration-reference/telemetry-settings`,
    },
    playground: {
      chatPlayground: `${ELASTIC_DOCS}solutions/search/rag/playground`,
      retrievalOptimize: `${ELASTIC_DOCS}solutions/search/rag/playground-query#playground-query-relevance`,
      retrieval: `${ELASTIC_DOCS}solutions/search/rag/playground-query`,
      context: `${ELASTIC_DOCS}solutions/search/rag/playground-context`,
      hiddenFields: `${ELASTIC_DOCS}solutions/search/rag/playground-query#playground-hidden-fields`,
    },
    inferenceManagement: {
      inferenceAPIDocumentation: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-inference-put`
        : `${ELASTICSEARCH_APIS}operation/operation-inference-put`,
    },
    synonyms: {
      synonymsAPIDocumentation: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}group/endpoint-synonyms`
        : `${ELASTICSEARCH_APIS}group/endpoint-synonyms`,
    },
    queryRules: {
      queryRulesAPIDocumentation: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}group/endpoint-query_rules`
        : `${ELASTICSEARCH_APIS}group/endpoint-query_rules`,
    },
  });
};
