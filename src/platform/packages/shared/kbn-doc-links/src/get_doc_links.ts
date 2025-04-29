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
  const PLUGIN_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`;
  const OBSERVABILITY_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/`;
  const SECURITY_SOLUTION_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/`;
  const ENTERPRISE_SEARCH_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/enterprise-search/${DOC_LINK_VERSION}/`;
  const ESRE_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/esre/${DOC_LINK_VERSION}/`;
  const SEARCH_UI_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/search-ui/current/`;
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
      upgradingStackOnPrem: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack/current/upgrading-elastic-stack-on-prem.html`,
      upgradingStackOnCloud: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack/current/upgrade-elastic-stack-for-elastic-cloud.html`,
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
      beatsAndLogstashConfiguration: `${ELASTIC_WEBSITE_URL}guide/en/cloud/current/ec-cloud-id.html`,
      indexManagement: `${ELASTIC_WEBSITE_URL}guide/en/cloud/current/ec-configure-index-management.html`,
    },
    console: {
      guide: isServerless
        ? `${SERVERLESS_DOCS}devtools-run-api-requests-in-the-console.html`
        : `${KIBANA_DOCS}console-kibana.html`,
      serverlessGuide: `${SERVERLESS_DOCS}devtools-run-api-requests-in-the-console.html`,
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
      composite: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-composite-aggregation.html`,
      composite_missing_bucket: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-composite-aggregation.html#_missing_bucket`,
      date_histogram: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-datehistogram-aggregation.html`,
      date_range: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-daterange-aggregation.html`,
      date_format_pattern: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-daterange-aggregation.html#date-format-pattern`,
      filter: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-filter-aggregation.html`,
      filters: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-filters-aggregation.html`,
      geohash_grid: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-geohashgrid-aggregation.html`,
      histogram: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-histogram-aggregation.html`,
      ip_range: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-iprange-aggregation.html`,
      range: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-range-aggregation.html`,
      significant_terms: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-significantterms-aggregation.html`,
      terms: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-terms-aggregation.html`,
      terms_doc_count_error: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-terms-aggregation.html#_per_bucket_document_count_error`,
      rare_terms: `${ELASTICSEARCH_DOCS}search-aggregations-bucket-rare-terms-aggregation.html`,
      avg: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-avg-aggregation.html`,
      avg_bucket: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-avg-bucket-aggregation.html`,
      max_bucket: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-max-bucket-aggregation.html`,
      min_bucket: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-min-bucket-aggregation.html`,
      sum_bucket: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-sum-bucket-aggregation.html`,
      cardinality: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-cardinality-aggregation.html`,
      count: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-valuecount-aggregation.html`,
      cumulative_sum: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-sum-aggregation.html`,
      derivative: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-derivative-aggregation.html`,
      geo_bounds: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-geobounds-aggregation.html`,
      geo_centroid: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-geocentroid-aggregation.html`,
      max: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-max-aggregation.html`,
      median: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-percentile-aggregation.html`,
      min: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-min-aggregation.html`,
      moving_avg: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-movfn-aggregation.html`,
      percentile_ranks: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-percentile-rank-aggregation.html`,
      serial_diff: `${ELASTICSEARCH_DOCS}search-aggregations-pipeline-serialdiff-aggregation.html`,
      std_dev: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-extendedstats-aggregation.html`,
      sum: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-sum-aggregation.html`,
      top_hits: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-top-hits-aggregation.html`,
      top_metrics: `${ELASTICSEARCH_DOCS}search-aggregations-metrics-top-metrics.html`,
      change_point: `${ELASTICSEARCH_DOCS}search-aggregations-change-point-aggregation.html`,
    },
    runtimeFields: {
      overview: `${ELASTICSEARCH_DOCS}runtime.html`,
      mapping: `${ELASTICSEARCH_DOCS}runtime-mapping-fields.html`,
    },
    scriptedFields: {
      scriptFields: `${ELASTICSEARCH_DOCS}search-fields.html#script-fields`,
      scriptAggs: `${ELASTICSEARCH_DOCS}search-aggregations.html`,
      painless: `${ELASTICSEARCH_DOCS}modules-scripting-painless.html`,
      painlessApi: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-api-reference.html`,
      painlessLangSpec: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-lang-spec.html`,
      painlessSyntax: `${ELASTICSEARCH_DOCS}modules-scripting-painless-syntax.html`,
      painlessWalkthrough: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-walkthrough.html`,
      painlessLanguage: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-lang-spec.html`,
      luceneExpressions: `${ELASTICSEARCH_DOCS}modules-scripting-expression.html`,
    },
    indexPatterns: {
      introduction: isServerless
        ? `${SERVERLESS_DOCS}data-views.html`
        : `${KIBANA_DOCS}data-views.html`,
      fieldFormattersNumber: `${KIBANA_DOCS}numeral.html`,
      fieldFormattersString: `${KIBANA_DOCS}managing-data-views.html#string-field-formatters`,
      runtimeFields: `${KIBANA_DOCS}managing-data-views.html#runtime-fields`,
      migrateOffScriptedFields: `${KIBANA_DOCS}managing-data-views.html#migrate-off-scripted-fields`,
    },
    addData: `${KIBANA_DOCS}connect-to-elasticsearch.html`,
    kibana: {
      askElastic: `${ELASTIC_WEBSITE_URL}products/kibana/ask-elastic?blade=kibanaaskelastic`,
      createGithubIssue: `${ELASTIC_GITHUB}kibana/issues/new/choose`,
      feedback: `${ELASTIC_WEBSITE_URL}products/kibana/feedback?blade=kibanafeedback`,
      guide: `${KIBANA_DOCS}index.html`,
      autocompleteSuggestions: `${KIBANA_DOCS}kibana-concepts-analysts.html#autocomplete-suggestions`,
      secureSavedObject: `${KIBANA_DOCS}xpack-security-secure-saved-objects.html`,
      xpackSecurity: `${KIBANA_DOCS}xpack-security.html`,
      restApis: isServerless ? `${KIBANA_SERVERLESS_APIS}` : `${KIBANA_APIS}`,
      dashboardImportExport: `${KIBANA_DOCS}dashboard-api.html`,
      upgradeNotes: `${KIBANA_DOCS}breaking-changes-summary.html`,
    },
    upgradeAssistant: {
      overview: `${KIBANA_DOCS}upgrade-assistant.html`,
      batchReindex: `${KIBANA_DOCS}batch-start-resume-reindex.html`,
      indexBlocks: `${ELASTICSEARCH_DOCS}index-modules-blocks.html#index-block-settings`,
      remoteReindex: `${ELASTICSEARCH_DOCS}docs-reindex.html#reindex-from-remote`,
      unfreezeApi: `https://www.elastic.co/guide/en/elastic-stack/9.0/release-notes-elasticsearch-9.0.0.html#remove_unfreeze_rest_endpoint`,
      reindexWithPipeline: `${ELASTICSEARCH_DOCS}docs-reindex.html#reindex-with-an-ingest-pipeline`,
    },
    rollupJobs: `${KIBANA_DOCS}data-rollups.html`,
    elasticsearch: {
      docsBase: `https://www.elastic.co/docs/solutions/search`,
      asyncSearch: `https://www.elastic.co/docs/solutions/search/async-search-api`,
      dataStreams: `https://www.elastic.co/docs/manage-data/data-store/data-streams`,
      deprecationLogging: `https://www.elastic.co/docs/deploy-manage/monitor/logging-configuration/update-elasticsearch-logging-levels#deprecation-logging`,
      createEnrichPolicy: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-enrich-put-policy`,
      matchAllQuery: `https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-match-all-query`,
      enrichPolicies: `https://www.elastic.co/docs/manage-data/ingest/transform-enrich/data-enrichment#enrich-policy`,
      createIndex: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create`,
      createIndexParameters: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-create#operation-indices-create-path`,
      frozenIndices: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-indices-unfreeze`,
      gettingStarted: `https://www.elastic.co/docs/solutions/search/get-started`,
      hiddenIndices: `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/api-conventions#hidden`,
      ilm: `https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management`,
      ilmForceMerge: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-forcemerge`,
      ilmFreeze: `https://www.elastic.co/blog/significantly-decrease-your-elasticsearch-heap-memory-usage`,
      ilmDelete: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-delete`,
      ilmPhaseTransitions: `https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/index-lifecycle#ilm-phase-transitions`,
      ilmReadOnly: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-readonly`,
      ilmRollover: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover`,
      ilmSearchableSnapshot: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-searchable-snapshot`,
      ilmSetPriority: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-set-priority`,
      ilmShrink: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-shrink`,
      ilmWaitForSnapshot: `https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-wait-for-snapshot`,
      indexModules: `https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules`,
      indexSettings: `https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#index-modules-settings`,
      dynamicIndexSettings: `https://www.elastic.co/docs/reference/elasticsearch/index-settings/index-modules#dynamic-index-settings`,
      indexTemplates: `https://www.elastic.co/docs/manage-data/data-store/templates`,
      mapping: `https://www.elastic.co/docs/manage-data/data-store/mapping`,
      mappingAnalyzer: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/analyzer`,
      mappingCoerce: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/coerce`,
      mappingCopyTo: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/copy-to`,
      mappingDocValues: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/doc-values`,
      mappingDynamic: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/dynamic`,
      mappingDynamicFields: `https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-field-mapping`,
      mappingDynamicTemplates: `https://www.elastic.co/docs/manage-data/data-store/mapping/dynamic-templates`,
      mappingEagerGlobalOrdinals: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/eager-global-ordinals`,
      mappingEnabled: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/enabled`,
      mappingFieldData: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text#fielddata-mapping-param`,
      mappingFieldDataEnable: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text#before-enabling-fielddata`,
      mappingFieldDataFilter: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/text#field-data-filtering`,
      mappingFieldDataTypes: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/field-data-types`,
      mappingFormat: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-date-format`,
      mappingIgnoreAbove: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ignore-above`,
      mappingIgnoreMalformed: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/ignore-malformed`,
      mappingIndex: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-index`,
      mappingIndexOptions: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/index-options`,
      mappingIndexPhrases: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/index-phrases`,
      mappingIndexPrefixes: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/index-prefixes`,
      mappingJoinFieldsPerformance: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/parent-join#_parent_join_and_performance`,
      mappingMeta: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-field-meta`,
      mappingMetaFields: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-meta-field`,
      mappingMultifields: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/multi-fields`,
      mappingNormalizer: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/normalizer`,
      mappingNorms: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/norms`,
      mappingNullValue: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/null-value`,
      mappingParameters: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-parameters`,
      mappingPositionIncrementGap: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/position-increment-gap`,
      mappingRankFeatureFields: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/rank-feature`,
      mappingRouting: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-routing-field`,
      mappingSettingsLimit: `https://www.elastic.co/docs/reference/elasticsearch/index-settings/mapping-limit`,
      mappingSimilarity: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/similarity`,
      mappingSourceFields: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-source-field`,
      mappingSourceFieldsDisable: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-source-field#disable-source-field`,
      mappingSyntheticSourceFields: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-source-field#synthetic-source`,
      mappingStore: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/mapping-store`,
      mappingSubobjects: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/subobjects`,
      mappingTermVector: `https://www.elastic.co/docs/reference/elasticsearch/mapping-reference/term-vector`,
      mappingTypesRemoval: `https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types`,
      migrateIndexAllocationFilters: `https://www.elastic.co/docs/manage-data/lifecycle/index-lifecycle-management/migrate-index-allocation-filters-to-node-roles`,
      migrationApiDeprecation: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-migration-deprecations`,
      nodeRoles: `https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/node-settings#node-roles`,
      reindexDatastreamApiSettings: `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reindex-data-stream#reindex-data-stream-api-settings`,
      releaseHighlights: `https://www.elastic.co/guide/en/elasticsearch/reference/8.18/release-highlights.html`,
      latestReleaseHighlights: `https://www.elastic.co/docs/release-notes`,
      remoteClusters: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-self-managed`,
      remoteClustersProxy: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-self-managed#proxy-mode`,
      remoteClusersProxySettings: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-settings#remote-cluster-proxy-settings`,
      remoteClustersOnPremSetupTrustWithCert: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-cert`,
      remoteClustersOnPremSetupTrustWithApiKey: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key`,
      remoteClustersCloudSetupTrust: `https://www.elastic.co/docs/deploy-manage/remote-clusters/ec-enable-ccs`,
      remoteClustersCreateCloudClusterApiKey: `https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-security-create-cross-cluster-api-key`,
      remoteClustersOnPremPrerequisitesApiKey: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key#remote-clusters-prerequisites-api-key`,
      remoteClustersOnPremSecurityApiKey: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-api-key#remote-clusters-security-api-key`,
      remoteClustersOnPremPrerequisitesCert: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-cert#remote-clusters-prerequisites-cert`,
      remoteClustersOnPremSecurityCert: `https://www.elastic.co/docs/deploy-manage/remote-clusters/remote-clusters-cert#remote-clusters-security-cert`,
      rollupMigratingToDownsampling: `https://www.elastic.co/docs/manage-data/lifecycle/rollup/migrating-from-rollup-to-downsampling`,
      rrf: `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/reciprocal-rank-fusion`,
      scriptParameters: `https://www.elastic.co/docs/explore-analyze/scripting/modules-scripting-using#prefer-params`,
      secureCluster: `https://www.elastic.co/docs/deploy-manage/security`,
      shardAllocationSettings: `https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings#cluster-shard-allocation-settings`,
      sortSearch: `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/sort-search-results`,
      tutorialUpdateExistingDataStream: `https://www.elastic.co/docs/manage-data/lifecycle/data-stream/tutorial-update-existing-data-stream`,
      transportSettings: `https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/networking-settings#common-network-settings`,
      typesRemoval: `https://www.elastic.co/docs/manage-data/data-store/mapping/removal-of-mapping-types`,
      setupUpgrade: `https://www.elastic.co/docs/deploy-manage/upgrade/deployment-or-cluster`,
      apiCompatibilityHeader: `https://www.elastic.co/docs/reference/elasticsearch/rest-apis/api-conventions#api-compatibility`,
      migrationGuide: `https://www.elastic.co/docs/release-notes/elasticsearch/breaking-changes`,
    },
    siem: {
      guide: `${SECURITY_SOLUTION_DOCS}index.html`,
      gettingStarted: `${SECURITY_SOLUTION_DOCS}index.html`,
      privileges: `${SECURITY_SOLUTION_DOCS}sec-requirements.html`,
      ml: `${SECURITY_SOLUTION_DOCS}machine-learning.html`,
      ruleChangeLog: `${SECURITY_SOLUTION_DOCS}prebuilt-rules-downloadable-updates.html`,
      detectionsReq: `${SECURITY_SOLUTION_DOCS}detections-permissions-section.html`,
      networkMap: `${SECURITY_SOLUTION_DOCS}conf-map-ui.html`,
      troubleshootGaps: `${SECURITY_SOLUTION_DOCS}alerts-ui-monitor.html#troubleshoot-gaps`,
      ruleApiOverview: `${SECURITY_SOLUTION_DOCS}rule-api-overview.html`,
      configureAlertSuppression: `${SECURITY_SOLUTION_DOCS}alert-suppression.html#_configure_alert_suppression`,
    },
    server: {
      protocol: `${KIBANA_DOCS}settings.html#server-protocol`,
    },
    logging: {
      enableDeprecationHttpDebugLogs: `${KIBANA_DOCS}logging-settings.html#enable-http-debug-logs`,
    },
    securitySolution: {
      artifactControl: `${SECURITY_SOLUTION_DOCS}artifact-control.html`,
      avcResults: `${ELASTIC_WEBSITE_URL}blog/elastic-security-av-comparatives-business-test`,
      bidirectionalIntegrations: `${SECURITY_SOLUTION_DOCS}third-party-actions.html`,
      trustedApps: `${SECURITY_SOLUTION_DOCS}trusted-apps-ov.html`,
      eventFilters: `${SECURITY_SOLUTION_DOCS}event-filters.html`,
      blocklist: `${SECURITY_SOLUTION_DOCS}blocklist.html`,
      threatIntelInt: `${SECURITY_SOLUTION_DOCS}es-threat-intel-integrations.html`,
      endpointArtifacts: `${SECURITY_SOLUTION_DOCS}endpoint-artifacts.html`,
      eventMerging: `${SECURITY_SOLUTION_DOCS}endpoint-data-volume.html`,
      policyResponseTroubleshooting: {
        full_disk_access: `${SECURITY_SOLUTION_DOCS}deploy-elastic-endpoint.html#enable-fda-endpoint`,
        macos_system_ext: `${SECURITY_SOLUTION_DOCS}deploy-elastic-endpoint.html#system-extension-endpoint`,
        linux_deadlock: `${SECURITY_SOLUTION_DOCS}ts-management.html#linux-deadlock`,
      },
      packageActionTroubleshooting: {
        es_connection: `${SECURITY_SOLUTION_DOCS}ts-management.html`,
      },
      responseActions: `${SECURITY_SOLUTION_DOCS}response-actions.html`,
      configureEndpointIntegrationPolicy: `${SECURITY_SOLUTION_DOCS}configure-endpoint-integration-policy.html`,
      exceptions: {
        value_lists: `${SECURITY_SOLUTION_DOCS}value-lists-exceptions.html`,
      },
      privileges: `${SECURITY_SOLUTION_DOCS}endpoint-management-req.html`,
      manageDetectionRules: `${SECURITY_SOLUTION_DOCS}rules-ui-management.html`,
      createDetectionRules: `${SECURITY_SOLUTION_DOCS}rules-ui-create.html`,
      updatePrebuiltDetectionRules: isServerless
        ? `${SERVERLESS_DOCS}security-prebuilt-rules-management.html#update-prebuilt-rules`
        : `${SECURITY_SOLUTION_DOCS}prebuilt-rules-management.html#update-prebuilt-rules`,
      prebuiltRuleCustomizationPromoBlog: `${ELASTIC_WEBSITE_URL}blog/security-prebuilt-rules-editing`,
      createEsqlRuleType: `${SECURITY_SOLUTION_DOCS}rules-ui-create.html#create-esql-rule`,
      ruleUiAdvancedParams: `${SECURITY_SOLUTION_DOCS}rules-ui-create.html#rule-ui-advanced-params`,
      entityAnalytics: {
        riskScorePrerequisites: `${SECURITY_SOLUTION_DOCS}ers-requirements.html`,
        entityRiskScoring: `${SECURITY_SOLUTION_DOCS}entity-risk-scoring.html`,
        assetCriticality: `${SECURITY_SOLUTION_DOCS}asset-criticality.html`,
      },
      detectionEngineOverview: `${SECURITY_SOLUTION_DOCS}detection-engine-overview.html`,
      aiAssistant: `${SECURITY_SOLUTION_DOCS}security-assistant.html`,
      signalsMigrationApi: `${SECURITY_SOLUTION_DOCS}signals-migration-api.html`,
      legacyEndpointManagementApiDeprecations: `${KIBANA_DOCS}breaking-changes-summary.html#breaking-199598`,
      legacyRuleManagementBulkApiDeprecations: `${KIBANA_DOCS}breaking-changes-summary.html#breaking-207091`,
      siemMigrations: `${SECURITY_SOLUTION_DOCS}siem-migration.html`,
      llmPerformanceMatrix: `${SECURITY_SOLUTION_DOCS}llm-performance-matrix.html`,
    },
    query: {
      eql: `${ELASTICSEARCH_DOCS}eql.html`,
      kueryQuerySyntax: `${KIBANA_DOCS}kuery-query.html`,
      luceneQuery: `${ELASTICSEARCH_DOCS}query-dsl-query-string-query.html`,
      luceneQuerySyntax: `${ELASTICSEARCH_DOCS}query-dsl-query-string-query.html#query-string-syntax`,
      percolate: `${ELASTICSEARCH_DOCS}query-dsl-percolate-query.html`,
      queryDsl: `${ELASTICSEARCH_DOCS}query-dsl.html`,
      queryESQL: `${ELASTICSEARCH_DOCS}esql.html`,
      queryESQLExamples: `${ELASTICSEARCH_DOCS}esql-examples.html`,
    },
    search: {
      sessions: `${KIBANA_DOCS}search-sessions.html`,
      sessionLimits: `${KIBANA_DOCS}search-sessions.html#_limitations`,
    },
    date: {
      dateMath: `${ELASTICSEARCH_DOCS}common-options.html#date-math`,
      dateMathIndexNames: `${ELASTICSEARCH_DOCS}date-math-index-names.html`,
    },
    management: {
      dashboardSettings: `${KIBANA_DOCS}advanced-options.html#kibana-dashboard-settings`,
      indexManagement: isServerless
        ? `${SERVERLESS_DOCS}index-management.html`
        : `${ELASTICSEARCH_DOCS}index-mgmt.html`,
      kibanaSearchSettings: `${KIBANA_DOCS}advanced-options.html#kibana-search-settings`,
      discoverSettings: `${KIBANA_DOCS}advanced-options.html#kibana-discover-settings`,
      rollupSettings: `${KIBANA_DOCS}advanced-options.html#kibana-rollups-settings`,
      visualizationSettings: `${KIBANA_DOCS}advanced-options.html#kibana-visualization-settings`,
      timelionSettings: `${KIBANA_DOCS}advanced-options.html#kibana-timelion-settings`,
      generalSettings: `${KIBANA_DOCS}advanced-options.html#kibana-general-settings`,
      savedObjectsApiList: isServerless
        ? `${KIBANA_SERVERLESS_APIS}group/endpoint-saved-objects`
        : `${KIBANA_APIS}group/endpoint-saved-objects`,
      apiKeys: `${KIBANA_DOCS}api-keys.html`,
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
      apiKeyServiceSettings: `${ELASTICSEARCH_DOCS}security-settings.html#api-key-service-settings`,
      clusterPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-cluster`,
      definingRoles: `${ELASTICSEARCH_DOCS}defining-roles.html`,
      elasticsearchSettings: `${ELASTICSEARCH_DOCS}security-settings.html`,
      elasticsearchEnableSecurity: `${ELASTICSEARCH_DOCS}configuring-stack-security.html`,
      elasticsearchEnableApiKeys: `${ELASTICSEARCH_DOCS}security-settings.html#api-key-service-settings`,
      indicesPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-indices`,
      kibanaTLS: `${ELASTICSEARCH_DOCS}security-basic-setup.html#encrypt-internode-communication`,
      kibanaPrivileges: `${KIBANA_DOCS}kibana-privileges.html`,
      mappingRoles: `${ELASTICSEARCH_DOCS}mapping-roles.html`,
      mappingRolesFieldRules: `${ELASTICSEARCH_DOCS}role-mapping-resources.html#mapping-roles-rule-field`,
      runAsPrivilege: `${ELASTICSEARCH_DOCS}security-privileges.html#_run_as_privilege`,
      deprecatedV1Endpoints: `${KIBANA_DOCS}breaking-changes-summary.html#breaking-199656`,
      enableElasticSearchSecurityFeatures: `${ELASTICSEARCH_DOCS}security-minimal-setup.html#_enable_elasticsearch_security_features`,
    },
    spaces: {
      kibanaLegacyUrlAliases: `${KIBANA_DOCS}legacy-url-aliases.html`,
      kibanaDisableLegacyUrlAliasesApi: `${KIBANA_DOCS}spaces-api-disable-legacy-url-aliases.html`,
    },
    watcher: {
      jiraAction: `${ELASTICSEARCH_DOCS}actions-jira.html`,
      pagerDutyAction: `${ELASTICSEARCH_DOCS}actions-pagerduty.html`,
      slackAction: `${ELASTICSEARCH_DOCS}actions-slack.html`,
      ui: `${KIBANA_DOCS}watcher-ui.html`,
    },
    ccs: {
      guide: `${ELASTICSEARCH_DOCS}modules-cross-cluster-search.html`,
      skippingDisconnectedClusters: `${ELASTICSEARCH_DOCS}modules-cross-cluster-search.html#skip-unavailable-clusters`,
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
      azureRepo: `${ELASTICSEARCH_DOCS}repository-azure.html`,
      gcsRepo: `${ELASTICSEARCH_DOCS}repository-gcs.html`,
      hdfsRepo: `${PLUGIN_DOCS}repository-hdfs.html`,
      ingestAttachment: `${PLUGIN_DOCS}ingest-attachment.html`,
      s3Repo: `${ELASTICSEARCH_DOCS}repository-s3.html`,
      snapshotRestoreRepos: `${ELASTICSEARCH_DOCS}snapshots-register-repository.html`,
      mapperSize: `${PLUGIN_DOCS}mapper-size-usage.html`,
    },
    snapshotRestore: {
      guide: `${ELASTICSEARCH_DOCS}snapshot-restore.html`,
      changeIndexSettings: `${ELASTICSEARCH_DOCS}index-modules.html`,
      createSnapshot: `${ELASTICSEARCH_DOCS}snapshots-take-snapshot.html`,
      getSnapshot: `${ELASTICSEARCH_APIS}operation/operation-snapshot-get`,
      registerSharedFileSystem: `${ELASTICSEARCH_DOCS}snapshots-filesystem-repository.html#filesystem-repository-settings`,
      registerSourceOnly: `${ELASTICSEARCH_DOCS}snapshots-source-only-repository.html#source-only-repository-settings`,
      registerUrl: `${ELASTICSEARCH_DOCS}snapshots-read-only-repository.html#read-only-url-repository-settings`,
      restoreSnapshot: `${ELASTICSEARCH_DOCS}snapshots-restore-snapshot.html`,
      restoreSnapshotApi: `${ELASTICSEARCH_APIS}operation/operation-snapshot-restore`,
      searchableSnapshotSharedCache: `${ELASTICSEARCH_DOCS}searchable-snapshots.html#searchable-snapshots-shared-cache`,
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
      guide: `${ELASTIC_WEBSITE_URL}guide/en/ecs/${ECS_VERSION}/index.html`,
      dataStreams: `${ELASTIC_WEBSITE_URL}guide/en/ecs/${ECS_VERSION}/ecs-data_stream.html`,
    },
    clients: {
      /** Changes to these URLs must also be synched in src/platform/plugins/shared/custom_integrations/server/language_clients/index.ts */
      guide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/index.html`,
      goConnecting: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/go-api/${DOC_LINK_VERSION}/connecting.html`,
      goGettingStarted: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/go-api/${DOC_LINK_VERSION}/getting-started-go.html`,
      goIndex: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/go-api/${DOC_LINK_VERSION}/index.html`,
      goOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/go-api/${DOC_LINK_VERSION}/overview.html`,
      javaBasicAuthentication: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/_basic_authentication.html`,
      javaIndex: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/index.html`,
      javaInstallation: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/installation.html`,
      javaIntroduction: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/introduction.html`,
      javaRestLow: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/java-rest-low.html`,
      jsAdvancedConfig: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/advanced-config.html`,
      jsApiReference: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/api-reference.html`,
      jsBasicConfig: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/basic-config.html`,
      jsClientConnecting: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/client-connecting.html`,
      jsIntro: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/introduction.html`,
      netGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/${DOC_LINK_VERSION}/index.html`,
      netIntroduction: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/${DOC_LINK_VERSION}/introduction.html`,
      netNest: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/${DOC_LINK_VERSION}/nest.html`,
      netSingleNode: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/${DOC_LINK_VERSION}/connecting.html#single-node`,
      phpConfiguration: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/${DOC_LINK_VERSION}/configuration.html`,
      phpConnecting: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/${DOC_LINK_VERSION}/connecting.html`,
      phpInstallation: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/${DOC_LINK_VERSION}/installation.html`,
      phpGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/${DOC_LINK_VERSION}/index.html`,
      phpOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/${DOC_LINK_VERSION}/overview.html`,
      pythonAuthentication: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/connecting.html#authentication`,
      pythonConfig: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/config.html`,
      pythonConnecting: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/connecting.html`,
      pythonGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/index.html`,
      pythonOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/overview.html`,
      rubyAuthentication: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/connecting.html#client-auth`,
      rubyAdvancedConfig: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/advanced-config.html`,
      rubyBasicConfig: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/basic-config.html`,
      rubyExamples: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/examples.html`,
      rubyOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/ruby_client.html`,
      rustGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/rust-api/${DOC_LINK_VERSION}/index.html`,
      rustOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/rust-api/${DOC_LINK_VERSION}/overview.html`,
      eland: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/eland/current/index.html`,
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
      resolveMigrationFailures: `${KIBANA_DOCS}resolve-migrations-failures.html`,
      repeatedTimeoutRequests: `${KIBANA_DOCS}resolve-migrations-failures.html#_repeated_time_out_requests_that_eventually_fail`,
      routingAllocationDisabled: `${KIBANA_DOCS}resolve-migrations-failures.html#routing-allocation-disabled`,
      clusterShardLimitExceeded: `${KIBANA_DOCS}resolve-migrations-failures.html#cluster-shard-limit-exceeded`,
    },
    searchUI: {
      appSearch: `${SEARCH_UI_DOCS}tutorials/app-search`,
      elasticsearch: `${SEARCH_UI_DOCS}tutorials/elasticsearch`,
    },
    serverlessClients: {
      clientLib: `${SERVERLESS_DOCS}elasticsearch-clients.html`,
      goApiReference: `${SERVERLESS_DOCS}elasticsearch-go-client-getting-started.html`,
      goGettingStarted: `${SERVERLESS_DOCS}elasticsearch-go-client-getting-started.html`,
      httpApis: `${SERVERLESS_DOCS}elasticsearch-http-apis.html`,
      httpApiReferences: `${SERVERLESS_DOCS}elasticsearch-http-apis.html`,
      jsApiReference: `${SERVERLESS_DOCS}elasticsearch-nodejs-client-getting-started.html`,
      jsGettingStarted: `${SERVERLESS_DOCS}elasticsearch-nodejs-client-getting-started.html`,
      phpApiReference: `${SERVERLESS_DOCS}elasticsearch-php-client-getting-started.html`,
      phpGettingStarted: `${SERVERLESS_DOCS}elasticsearch-php-client-getting-started.html`,
      pythonApiReference: `${SERVERLESS_DOCS}elasticsearch-python-client-getting-started.html`,
      pythonGettingStarted: `${SERVERLESS_DOCS}elasticsearch-python-client-getting-started.html`,
      pythonReferences: `${SERVERLESS_DOCS}elasticsearch-python-client-getting-started.html`,
      rubyApiReference: `${SERVERLESS_DOCS}elasticsearch-ruby-client-getting-started.html`,
      rubyGettingStarted: `${SERVERLESS_DOCS}elasticsearch-ruby-client-getting-started.html`,
    },
    serverlessSearch: {
      integrations: `${SERVERLESS_DOCS}elasticsearch-ingest-your-data.html`,
      integrationsLogstash: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-logstash.html`,
      integrationsBeats: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-beats.html`,
      integrationsConnectorClient: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-integrations-connector-client.html`,
      integrationsConnectorClientAvailableConnectors: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-integrations-connector-client.html#elasticsearch-ingest-data-through-integrations-connector-client-available-connectors`,
      integrationsConnectorClientRunFromSource: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-integrations-connector-client.html#elasticsearch-ingest-data-through-integrations-connector-client-run-from-source`,
      integrationsConnectorClientRunWithDocker: `${SERVERLESS_DOCS}elasticsearch-ingest-data-through-integrations-connector-client.html#elasticsearch-ingest-data-through-integrations-connector-client-run-with-docker`,
      gettingStartedExplore: `${SERVERLESS_DOCS}elasticsearch-get-started.html`,
      gettingStartedIngest: `${SERVERLESS_DOCS}elasticsearch-get-started.html`,
      gettingStartedSearch: `${SERVERLESS_DOCS}elasticsearch-get-started.html`,
    },
    serverlessSecurity: {
      apiKeyPrivileges: `${SERVERLESS_DOCS}api-keys.html#api-keys-restrict-privileges`,
    },
    synthetics: {
      featureRoles: isServerless
        ? `${SERVERLESS_DOCS}observability-synthetics-feature-roles.html`
        : `${OBSERVABILITY_DOCS}synthetics-feature-roles.html`,
    },
    telemetry: {
      settings: `${KIBANA_DOCS}telemetry-settings-kbn.html`,
    },
    playground: {
      chatPlayground: `${KIBANA_DOCS}playground.html`,
      retrievalOptimize: `${KIBANA_DOCS}playground-query.html#playground-query-relevance`,
      retrieval: `${KIBANA_DOCS}playground-query.html`,
      context: `${KIBANA_DOCS}playground-context.html`,
      hiddenFields: `${KIBANA_DOCS}playground-query.html#playground-hidden-fields`,
    },
    inferenceManagement: {
      inferenceAPIDocumentation: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}operation/operation-inference-put`
        : `${ELASTICSEARCH_APIS}operation/operation-inference-put`,
    },
    synonyms: {
      synonymsAPIDocumentation: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/current/synonyms-apis.html`,
    },
    queryRules: {
      queryRulesAPIDocumentation: isServerless
        ? `${ELASTICSEARCH_SERVERLESS_APIS}group/endpoint-query_rules`
        : `${ELASTICSEARCH_APIS}group/endpoint-query_rules`,
    },
  });
};
