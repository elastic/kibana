/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { deepFreeze } from '@kbn/std';
import { InjectedMetadataSetup } from '../injected_metadata';

interface StartDeps {
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export class DocLinksService {
  public setup() {}

  public start({ injectedMetadata }: StartDeps): DocLinksStart {
    const DOC_LINK_VERSION = injectedMetadata.getKibanaBranch();
    const ELASTIC_WEBSITE_URL = 'https://www.elastic.co/';
    const STACK_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack/${DOC_LINK_VERSION}/`;
    const ELASTICSEARCH_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;
    const KIBANA_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/`;
    const FLEET_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/fleet/${DOC_LINK_VERSION}/`;
    const PLUGIN_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/plugins/${DOC_LINK_VERSION}/`;
    const APM_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/apm/`;
    const SECURITY_SOLUTION_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/`;
    const STACK_GETTING_STARTED = `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack-get-started/${DOC_LINK_VERSION}/`;

    return deepFreeze({
      DOC_LINK_VERSION,
      ELASTIC_WEBSITE_URL,
      links: {
        settings: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/settings.html`,
        elasticStackGetStarted: `${STACK_GETTING_STARTED}get-started-elastic-stack.html`,
        upgrade: {
          upgradingElasticStack: `${STACK_DOCS}upgrading-elastic-stack.html`,
        },
        apm: {
          kibanaSettings: `${KIBANA_DOCS}apm-settings-in-kibana.html`,
          supportedServiceMaps: `${KIBANA_DOCS}service-maps.html#service-maps-supported`,
          customLinks: `${KIBANA_DOCS}custom-links.html`,
          droppedTransactionSpans: `${APM_DOCS}guide/${DOC_LINK_VERSION}/data-model-spans.html#data-model-dropped-spans`,
          upgrading: `${APM_DOCS}guide/${DOC_LINK_VERSION}/upgrade.html`,
          metaData: `${APM_DOCS}guide/${DOC_LINK_VERSION}/data-model-metadata.html`,
        },
        canvas: {
          guide: `${KIBANA_DOCS}canvas.html`,
        },
        dashboard: {
          guide: `${KIBANA_DOCS}dashboard.html`,
          drilldowns: `${KIBANA_DOCS}drilldowns.html`,
          drilldownsTriggerPicker: `${KIBANA_DOCS}drilldowns.html#url-drilldowns`,
          urlDrilldownTemplateSyntax: `${KIBANA_DOCS}url_templating-language.html`,
          urlDrilldownVariables: `${KIBANA_DOCS}url_templating-language.html#url-template-variables`,
        },
        discover: {
          guide: `${KIBANA_DOCS}discover.html`,
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
          base: `${ELASTIC_WEBSITE_URL}guide/en/enterprise-search/${DOC_LINK_VERSION}`,
          appSearchBase: `${ELASTIC_WEBSITE_URL}guide/en/app-search/${DOC_LINK_VERSION}`,
          workplaceSearchBase: `${ELASTIC_WEBSITE_URL}guide/en/workplace-search/${DOC_LINK_VERSION}`,
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
        },
        functionbeat: {
          base: `${ELASTIC_WEBSITE_URL}guide/en/beats/functionbeat/${DOC_LINK_VERSION}`,
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
        },
        runtimeFields: {
          overview: `${ELASTICSEARCH_DOCS}runtime.html`,
          mapping: `${ELASTICSEARCH_DOCS}runtime-mapping-fields.html`,
        },
        scriptedFields: {
          scriptFields: `${ELASTICSEARCH_DOCS}search-request-script-fields.html`,
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
          introduction: `${KIBANA_DOCS}index-patterns.html`,
          fieldFormattersNumber: `${KIBANA_DOCS}numeral.html`,
          fieldFormattersString: `${KIBANA_DOCS}field-formatters-string.html`,
          runtimeFields: `${KIBANA_DOCS}managing-index-patterns.html#runtime-fields`,
        },
        addData: `${KIBANA_DOCS}connect-to-elasticsearch.html`,
        kibana: `${KIBANA_DOCS}index.html`,
        upgradeAssistant: {
          overview: `${KIBANA_DOCS}upgrade-assistant.html`,
          batchReindex: `${KIBANA_DOCS}batch-start-resume-reindex.html`,
          remoteReindex: `${ELASTICSEARCH_DOCS}docs-reindex.html#reindex-from-remote`,
        },
        rollupJobs: `${KIBANA_DOCS}data-rollups.html`,
        elasticsearch: {
          docsBase: `${ELASTICSEARCH_DOCS}`,
          apiCompatibilityHeader: `${ELASTICSEARCH_DOCS}api-conventions.html#api-compatibility`,
          asyncSearch: `${ELASTICSEARCH_DOCS}async-search-intro.html`,
          dataStreams: `${ELASTICSEARCH_DOCS}data-streams.html`,
          deprecationLogging: `${ELASTICSEARCH_DOCS}logging.html#deprecation-logging`,
          ilm: `${ELASTICSEARCH_DOCS}index-lifecycle-management.html`,
          ilmForceMerge: `${ELASTICSEARCH_DOCS}ilm-forcemerge.html`,
          ilmFreeze: `${ELASTICSEARCH_DOCS}ilm-freeze.html`,
          ilmPhaseTransitions: `${ELASTICSEARCH_DOCS}ilm-index-lifecycle.html#ilm-phase-transitions`,
          ilmReadOnly: `${ELASTICSEARCH_DOCS}ilm-readonly.html`,
          ilmRollover: `${ELASTICSEARCH_DOCS}ilm-rollover.html`,
          ilmSearchableSnapshot: `${ELASTICSEARCH_DOCS}ilm-searchable-snapshot.html`,
          ilmSetPriority: `${ELASTICSEARCH_DOCS}ilm-set-priority.html`,
          ilmShrink: `${ELASTICSEARCH_DOCS}ilm-shrink.html`,
          ilmWaitForSnapshot: `${ELASTICSEARCH_DOCS}ilm-wait-for-snapshot.html`,
          indexModules: `${ELASTICSEARCH_DOCS}index-modules.html`,
          indexSettings: `${ELASTICSEARCH_DOCS}index-modules.html#index-modules-settings`,
          indexTemplates: `${ELASTICSEARCH_DOCS}index-templates.html`,
          mapping: `${ELASTICSEARCH_DOCS}mapping.html`,
          mappingAnalyzer: `${ELASTICSEARCH_DOCS}analyzer.html`,
          mappingBoost: `${ELASTICSEARCH_DOCS}mapping-boost.html`,
          mappingCoerce: `${ELASTICSEARCH_DOCS}coerce.html`,
          mappingCopyTo: `${ELASTICSEARCH_DOCS}copy-to.html`,
          mappingDocValues: `${ELASTICSEARCH_DOCS}doc-values.html`,
          mappingDynamic: `${ELASTICSEARCH_DOCS}dynamic.html`,
          mappingDynamicFields: `${ELASTICSEARCH_DOCS}dynamic-field-mapping.html`,
          mappingDynamicTemplates: `${ELASTICSEARCH_DOCS}dynamic-templates.html`,
          mappingEagerGlobalOrdinals: `${ELASTICSEARCH_DOCS}eager-global-ordinals.html`,
          mappingEnabled: `${ELASTICSEARCH_DOCS}enabled.html`,
          mappingFieldData: `${ELASTICSEARCH_DOCS}text.html#fielddata-mapping-param`,
          mappingFieldDataEnable: `${ELASTICSEARCH_DOCS}text.html#before-enabling-fielddata`,
          mappingFieldDataFilter: `${ELASTICSEARCH_DOCS}text.html#field-data-filtering`,
          mappingFieldDataTypes: `${ELASTICSEARCH_DOCS}mapping-types.html`,
          mappingFormat: `${ELASTICSEARCH_DOCS}mapping-date-format.html`,
          mappingIgnoreAbove: `${ELASTICSEARCH_DOCS}ignore-above.html`,
          mappingIgnoreMalformed: `${ELASTICSEARCH_DOCS}ignore-malformed.html`,
          mappingIndex: `${ELASTICSEARCH_DOCS}mapping-index.html`,
          mappingIndexOptions: `${ELASTICSEARCH_DOCS}index-options.html`,
          mappingIndexPhrases: `${ELASTICSEARCH_DOCS}index-phrases.html`,
          mappingIndexPrefixes: `${ELASTICSEARCH_DOCS}index-prefixes.html`,
          mappingJoinFieldsPerformance: `${ELASTICSEARCH_DOCS}parent-join.html#_parent_join_and_performance`,
          mappingMeta: `${ELASTICSEARCH_DOCS}mapping-field-meta.html`,
          mappingMetaFields: `${ELASTICSEARCH_DOCS}mapping-meta-field.html`,
          mappingNormalizer: `${ELASTICSEARCH_DOCS}normalizer.html`,
          mappingNorms: `${ELASTICSEARCH_DOCS}norms.html`,
          mappingNullValue: `${ELASTICSEARCH_DOCS}null-value.html`,
          mappingParameters: `${ELASTICSEARCH_DOCS}mapping-params.html`,
          mappingPositionIncrementGap: `${ELASTICSEARCH_DOCS}position-increment-gap.html`,
          mappingRankFeatureFields: `${ELASTICSEARCH_DOCS}rank-feature.html`,
          mappingRouting: `${ELASTICSEARCH_DOCS}mapping-routing-field.html`,
          mappingSimilarity: `${ELASTICSEARCH_DOCS}similarity.html`,
          mappingSourceFields: `${ELASTICSEARCH_DOCS}mapping-source-field.html`,
          mappingSourceFieldsDisable: `${ELASTICSEARCH_DOCS}mapping-source-field.html#disable-source-field`,
          mappingStore: `${ELASTICSEARCH_DOCS}mapping-store.html`,
          mappingTermVector: `${ELASTICSEARCH_DOCS}term-vector.html`,
          mappingTypesRemoval: `${ELASTICSEARCH_DOCS}removal-of-types.html`,
          migrateIndexAllocationFilters: `${ELASTICSEARCH_DOCS}migrate-index-allocation-filters.html`,
          migrationApiDeprecation: `${ELASTICSEARCH_DOCS}migration-api-deprecation.html`,
          nodeRoles: `${ELASTICSEARCH_DOCS}modules-node.html#node-roles`,
          releaseHighlights: `${ELASTICSEARCH_DOCS}release-highlights.html`,
          version8ReleaseHighlights: `${ELASTIC_WEBSITE_URL}guide/en/elastic-stack/8.0/elastic-stack-highlights.html`,
          remoteClusters: `${ELASTICSEARCH_DOCS}remote-clusters.html`,
          remoteClustersProxy: `${ELASTICSEARCH_DOCS}remote-clusters.html#proxy-mode`,
          remoteClusersProxySettings: `${ELASTICSEARCH_DOCS}remote-clusters-settings.html#remote-cluster-proxy-settings`,
          scriptParameters: `${ELASTICSEARCH_DOCS}modules-scripting-using.html#prefer-params`,
          setupUpgrade: `${ELASTICSEARCH_DOCS}setup-upgrade.html`,
          shardAllocationSettings: `${ELASTICSEARCH_DOCS}modules-cluster.html#cluster-shard-allocation-settings`,
          transportSettings: `${ELASTICSEARCH_DOCS}modules-network.html#common-network-settings`,
          typesRemoval: `${ELASTICSEARCH_DOCS}removal-of-types.html`,
        },
        siem: {
          guide: `${SECURITY_SOLUTION_DOCS}index.html`,
          gettingStarted: `${SECURITY_SOLUTION_DOCS}index.html`,
          privileges: `${SECURITY_SOLUTION_DOCS}sec-requirements.html`,
          ml: `${SECURITY_SOLUTION_DOCS}machine-learning.html`,
          ruleChangeLog: `${SECURITY_SOLUTION_DOCS}prebuilt-rules-changelog.html`,
          detectionsReq: `${SECURITY_SOLUTION_DOCS}detections-permissions-section.html`,
          networkMap: `${SECURITY_SOLUTION_DOCS}conf-map-ui.html`,
          troubleshootGaps: `${SECURITY_SOLUTION_DOCS}alerts-ui-monitor.html#troubleshoot-gaps`,
        },
        securitySolution: {
          trustedApps: `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/trusted-apps-ov.html`,
        },
        query: {
          eql: `${ELASTICSEARCH_DOCS}eql.html`,
          kueryQuerySyntax: `${KIBANA_DOCS}kuery-query.html`,
          luceneQuerySyntax: `${ELASTICSEARCH_DOCS}query-dsl-query-string-query.html#query-string-syntax`,
          percolate: `${ELASTICSEARCH_DOCS}query-dsl-percolate-query.html`,
          queryDsl: `${ELASTICSEARCH_DOCS}query-dsl.html`,
          autocompleteChanges: `${KIBANA_DOCS}kibana-concepts-analysts.html#autocomplete-suggestions`,
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
          indexManagement: `${ELASTICSEARCH_DOCS}index-mgmt.html`,
          kibanaGeneralSettings: `${KIBANA_DOCS}advanced-options.html#kibana-general-settings`,
          kibanaSearchSettings: `${KIBANA_DOCS}advanced-options.html#kibana-search-settings`,
          visualizationSettings: `${KIBANA_DOCS}advanced-options.html#kibana-visualization-settings`,
          timelionSettings: `${KIBANA_DOCS}advanced-options.html#kibana-timelion-settings`,
        },
        ml: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/index.html`,
          aggregations: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-aggregation.html`,
          anomalyDetection: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/xpack-ml.html`,
          anomalyDetectionJobs: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-jobs.html`,
          anomalyDetectionConfiguringCategories: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-categories.html`,
          anomalyDetectionBucketSpan: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#bucket-span`,
          anomalyDetectionCardinality: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#cardinality`,
          anomalyDetectionCreateJobs: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html`,
          anomalyDetectionDetectors: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#detectors`,
          anomalyDetectionInfluencers: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-influencers.html`,
          anomalyDetectionJobResource: `${ELASTICSEARCH_DOCS}ml-put-job.html#ml-put-job-path-parms`,
          anomalyDetectionJobResourceAnalysisConfig: `${ELASTICSEARCH_DOCS}ml-put-job.html#put-analysisconfig`,
          anomalyDetectionJobTips: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#job-tips`,
          alertingRules: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-alerts.html`,
          anomalyDetectionModelMemoryLimits: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#model-memory-limits`,
          calendars: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-calendars.html`,
          classificationEvaluation: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-classification`,
          customRules: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-rules.html`,
          customUrls: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-url.html`,
          dataFrameAnalytics: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics.html`,
          featureImportance: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-feature-importance.html`,
          outlierDetectionRoc: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-roc`,
          regressionEvaluation: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-regression-evaluation`,
          classificationAucRoc: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-class-aucroc`,
          setUpgradeMode: `${ELASTICSEARCH_DOCS}ml-set-upgrade-mode.html`,
        },
        transforms: {
          guide: `${ELASTICSEARCH_DOCS}transforms.html`,
          // TODO add valid docs URL
          alertingRules: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-alerts.html`,
        },
        visualize: {
          guide: `${KIBANA_DOCS}dashboard.html`,
          lens: `${ELASTIC_WEBSITE_URL}what-is/kibana-lens`,
          lensPanels: `${KIBANA_DOCS}lens.html`,
          maps: `${ELASTIC_WEBSITE_URL}maps`,
          vega: `${KIBANA_DOCS}vega.html`,
          tsvbIndexPatternMode: `${KIBANA_DOCS}tsvb.html#tsvb-index-pattern-mode`,
        },
        observability: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/index.html`,
          infrastructureThreshold: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/infrastructure-threshold-alert.html`,
          logsThreshold: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/logs-threshold-alert.html`,
          metricsThreshold: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/metrics-threshold-alert.html`,
          monitorStatus: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/monitor-status-alert.html`,
          monitorUptime: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/monitor-uptime.html`,
          tlsCertificate: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/tls-certificate-alert.html`,
          uptimeDurationAnomaly: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/duration-anomaly-alert.html`,
        },
        alerting: {
          guide: `${KIBANA_DOCS}create-and-manage-rules.html`,
          actionTypes: `${KIBANA_DOCS}action-types.html`,
          apmRules: `${KIBANA_DOCS}apm-alerts.html`,
          emailAction: `${KIBANA_DOCS}email-action-type.html`,
          emailActionConfig: `${KIBANA_DOCS}email-action-type.html`,
          emailExchangeClientSecretConfig: `${KIBANA_DOCS}email-action-type.html#exchange-client-secret`,
          emailExchangeClientIdConfig: `${KIBANA_DOCS}email-action-type.html#exchange-client-tenant-id`,
          generalSettings: `${KIBANA_DOCS}alert-action-settings-kb.html#general-alert-action-settings`,
          indexAction: `${KIBANA_DOCS}index-action-type.html`,
          esQuery: `${KIBANA_DOCS}rule-type-es-query.html`,
          indexThreshold: `${KIBANA_DOCS}rule-type-index-threshold.html`,
          pagerDutyAction: `${KIBANA_DOCS}pagerduty-action-type.html`,
          preconfiguredConnectors: `${KIBANA_DOCS}pre-configured-connectors.html`,
          preconfiguredAlertHistoryConnector: `${KIBANA_DOCS}index-action-type.html#preconfigured-connector-alert-history`,
          serviceNowAction: `${KIBANA_DOCS}servicenow-action-type.html#configuring-servicenow`,
          serviceNowSIRAction: `${KIBANA_DOCS}servicenow-sir-action-type.html`,
          setupPrerequisites: `${KIBANA_DOCS}alerting-setup.html#alerting-prerequisites`,
          slackAction: `${KIBANA_DOCS}slack-action-type.html#configuring-slack`,
          teamsAction: `${KIBANA_DOCS}teams-action-type.html#configuring-teams`,
        },
        maps: {
          guide: `${KIBANA_DOCS}maps.html`,
          importGeospatialPrivileges: `${KIBANA_DOCS}import-geospatial-data.html#import-geospatial-privileges`,
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
        security: {
          apiKeyServiceSettings: `${ELASTICSEARCH_DOCS}security-settings.html#api-key-service-settings`,
          clusterPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-cluster`,
          elasticsearchSettings: `${ELASTICSEARCH_DOCS}security-settings.html`,
          elasticsearchEnableSecurity: `${ELASTICSEARCH_DOCS}configuring-stack-security.html`,
          elasticsearchEnableApiKeys: `${ELASTICSEARCH_DOCS}security-settings.html#api-key-service-settings`,
          indicesPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-indices`,
          kibanaTLS: `${ELASTICSEARCH_DOCS}security-basic-setup.html#encrypt-internode-communication`,
          kibanaPrivileges: `${KIBANA_DOCS}kibana-privileges.html`,
          mappingRoles: `${ELASTICSEARCH_DOCS}mapping-roles.html`,
          mappingRolesFieldRules: `${ELASTICSEARCH_DOCS}role-mapping-resources.html#mapping-roles-rule-field`,
          runAsPrivilege: `${ELASTICSEARCH_DOCS}security-privileges.html#_run_as_privilege`,
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
          bulkIndexAlias: `${ELASTICSEARCH_DOCS}indices-aliases.html`,
          byteSizeUnits: `${ELASTICSEARCH_DOCS}common-options.html#byte-units`,
          createAutoFollowPattern: `${ELASTICSEARCH_DOCS}ccr-put-auto-follow-pattern.html`,
          createFollower: `${ELASTICSEARCH_DOCS}ccr-put-follow.html`,
          createIndex: `${ELASTICSEARCH_DOCS}indices-create-index.html`,
          createSnapshotLifecyclePolicy: `${ELASTICSEARCH_DOCS}slm-api-put-policy.html`,
          createRoleMapping: `${ELASTICSEARCH_DOCS}security-api-put-role-mapping.html`,
          createRoleMappingTemplates: `${ELASTICSEARCH_DOCS}security-api-put-role-mapping.html#_role_templates`,
          createRollupJobsRequest: `${ELASTICSEARCH_DOCS}rollup-put-job.html#rollup-put-job-api-request-body`,
          createApiKey: `${ELASTICSEARCH_DOCS}security-api-create-api-key.html`,
          createPipeline: `${ELASTICSEARCH_DOCS}put-pipeline-api.html`,
          createTransformRequest: `${ELASTICSEARCH_DOCS}put-transform.html#put-transform-request-body`,
          cronExpressions: `${ELASTICSEARCH_DOCS}cron-expressions.html`,
          executeWatchActionModes: `${ELASTICSEARCH_DOCS}watcher-api-execute-watch.html#watcher-api-execute-watch-action-mode`,
          indexExists: `${ELASTICSEARCH_DOCS}indices-exists.html`,
          openIndex: `${ELASTICSEARCH_DOCS}indices-open-close.html`,
          putComponentTemplate: `${ELASTICSEARCH_DOCS}indices-component-template.html`,
          painlessExecute: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html`,
          painlessExecuteAPIContexts: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html#_contexts`,
          putComponentTemplateMetadata: `${ELASTICSEARCH_DOCS}indices-component-template.html#component-templates-metadata`,
          putEnrichPolicy: `${ELASTICSEARCH_DOCS}put-enrich-policy-api.html`,
          putIndexTemplateV1: `${ELASTICSEARCH_DOCS}indices-templates-v1.html`,
          putSnapshotLifecyclePolicy: `${ELASTICSEARCH_DOCS}slm-api-put-policy.html`,
          putWatch: `${ELASTICSEARCH_DOCS}watcher-api-put-watch.html`,
          simulatePipeline: `${ELASTICSEARCH_DOCS}simulate-pipeline-api.html`,
          timeUnits: `${ELASTICSEARCH_DOCS}common-options.html#time-units`,
          updateTransform: `${ELASTICSEARCH_DOCS}update-transform.html`,
        },
        plugins: {
          azureRepo: `${PLUGIN_DOCS}repository-azure.html`,
          gcsRepo: `${PLUGIN_DOCS}repository-gcs.html`,
          hdfsRepo: `${PLUGIN_DOCS}repository-hdfs.html`,
          s3Repo: `${PLUGIN_DOCS}repository-s3.html`,
          snapshotRestoreRepos: `${PLUGIN_DOCS}repository.html`,
          mapperSize: `${PLUGIN_DOCS}mapper-size-usage.html`,
        },
        snapshotRestore: {
          guide: `${ELASTICSEARCH_DOCS}snapshot-restore.html`,
          changeIndexSettings: `${ELASTICSEARCH_DOCS}index-modules.html`,
          createSnapshot: `${ELASTICSEARCH_DOCS}snapshots-take-snapshot.html`,
          getSnapshot: `${ELASTICSEARCH_DOCS}get-snapshot-api.html`,
          registerSharedFileSystem: `${ELASTICSEARCH_DOCS}snapshots-register-repository.html#snapshots-filesystem-repository`,
          registerSourceOnly: `${ELASTICSEARCH_DOCS}snapshots-register-repository.html#snapshots-source-only-repository`,
          registerUrl: `${ELASTICSEARCH_DOCS}snapshots-register-repository.html#snapshots-read-only-repository`,
          restoreSnapshot: `${ELASTICSEARCH_DOCS}snapshots-restore-snapshot.html`,
          restoreSnapshotApi: `${ELASTICSEARCH_DOCS}restore-snapshot-api.html#restore-snapshot-api-request-body`,
          searchableSnapshotSharedCache: `${ELASTICSEARCH_DOCS}searchable-snapshots.html#searchable-snapshots-shared-cache`,
        },
        ingest: {
          append: `${ELASTICSEARCH_DOCS}append-processor.html`,
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
          pipelines: `${ELASTICSEARCH_DOCS}ingest.html`,
          pipelineFailure: `${ELASTICSEARCH_DOCS}ingest.html#handling-pipeline-failures`,
          processors: `${ELASTICSEARCH_DOCS}processors.html`,
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
          settings: `${FLEET_DOCS}fleet-settings.html#fleet-server-hosts-setting`,
          settingsFleetServerHostSettings: `${FLEET_DOCS}fleet-settings.html#fleet-server-hosts-setting`,
          settingsFleetServerProxySettings: `${KIBANA_DOCS}fleet-settings-kb.html#fleet-data-visualizer-settings`,
          troubleshooting: `${FLEET_DOCS}fleet-troubleshooting.html`,
          elasticAgent: `${FLEET_DOCS}elastic-agent-installation.html`,
          beatsAgentComparison: `${FLEET_DOCS}beats-agent-comparison.html`,
          datastreams: `${FLEET_DOCS}data-streams.html`,
          datastreamsNamingScheme: `${FLEET_DOCS}data-streams.html#data-streams-naming-scheme`,
          installElasticAgent: `${FLEET_DOCS}install-fleet-managed-elastic-agent.html`,
          upgradeElasticAgent: `${FLEET_DOCS}upgrade-elastic-agent.html`,
          upgradeElasticAgent712lower: `${FLEET_DOCS}upgrade-elastic-agent.html#upgrade-7.12-lower`,
          learnMoreBlog: `${ELASTIC_WEBSITE_URL}blog/elastic-agent-and-fleet-make-it-easier-to-integrate-your-systems-with-elastic`,
          apiKeysLearnMore: `${KIBANA_DOCS}api-keys.html`,
          onPremRegistry: `${FLEET_DOCS}air-gapped.html`,
        },
        ecs: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/ecs/current/index.html`,
        },
        clients: {
          /** Changes to these URLs must also be synched in src/plugins/custom_integrations/server/language_clients/index.ts */
          guide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/index.html`,
          goOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/go-api/${DOC_LINK_VERSION}/overview.html`,
          javaIndex: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/java-api-client/${DOC_LINK_VERSION}/index.html`,
          jsIntro: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/javascript-api/${DOC_LINK_VERSION}/introduction.html`,
          netGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/net-api/7.16/index.html`,
          perlGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/perl-api/current/index.html`,
          phpGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/php-api/7.x/index.html`,
          pythonGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/python-api/${DOC_LINK_VERSION}/index.html`,
          rubyOverview: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/ruby-api/${DOC_LINK_VERSION}/ruby_client.html`,
          rustGuide: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/client/rust-api/current/index.html`,
        },
        endpoints: {
          troubleshooting: `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/ts-management.html#ts-endpoints`,
        },
      },
    });
  }
}

/** @public */
export interface DocLinksStart {
  readonly DOC_LINK_VERSION: string;
  readonly ELASTIC_WEBSITE_URL: string;
  readonly links: {
    readonly settings: string;
    readonly elasticStackGetStarted: string;
    readonly upgrade: {
      readonly upgradingElasticStack: string;
    };
    readonly apm: {
      readonly kibanaSettings: string;
      readonly supportedServiceMaps: string;
      readonly customLinks: string;
      readonly droppedTransactionSpans: string;
      readonly upgrading: string;
      readonly metaData: string;
    };
    readonly canvas: {
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
    readonly enterpriseSearch: {
      readonly base: string;
      readonly appSearchBase: string;
      readonly workplaceSearchBase: string;
    };
    readonly heartbeat: {
      readonly base: string;
    };
    readonly libbeat: {
      readonly getStarted: string;
    };
    readonly logstash: {
      readonly base: string;
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
    readonly kibana: string;
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
    };
    readonly securitySolution: {
      readonly trustedApps: string;
    };
    readonly query: {
      readonly eql: string;
      readonly kueryQuerySyntax: string;
      readonly luceneQuerySyntax: string;
      readonly percolate: string;
      readonly queryDsl: string;
      readonly autocompleteChanges: string;
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
      openIndex: string;
      putComponentTemplate: string;
      painlessExecute: string;
      painlessExecuteAPIContexts: string;
      putComponentTemplateMetadata: string;
      putSnapshotLifecyclePolicy: string;
      putIndexTemplateV1: string;
      putWatch: string;
      simulatePipeline: string;
      timeUnits: string;
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
    }>;
    readonly alerting: Record<string, string>;
    readonly maps: Record<string, string>;
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
      datastreamsNamingScheme: string;
      installElasticAgent: string;
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
      readonly goOverview: string;
      readonly javaIndex: string;
      readonly jsIntro: string;
      readonly netGuide: string;
      readonly perlGuide: string;
      readonly phpGuide: string;
      readonly pythonGuide: string;
      readonly rubyOverview: string;
      readonly rustGuide: string;
    };
    readonly endpoints: {
      readonly troubleshooting: string;
    };
  };
}
