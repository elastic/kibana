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
    const ELASTICSEARCH_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;

    return deepFreeze({
      DOC_LINK_VERSION,
      ELASTIC_WEBSITE_URL,
      links: {
        dashboard: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/dashboard.html`,
          drilldowns: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/drilldowns.html`,
          drilldownsTriggerPicker: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/drilldowns.html#url-drilldowns`,
          urlDrilldownTemplateSyntax: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/url_templating-language.html`,
          urlDrilldownVariables: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/url_templating-language.html#url-template-variables`,
        },
        discover: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/discover.html`,
        },
        filebeat: {
          base: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}`,
          installation: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-installation-configuration.html`,
          configuration: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/configuring-howto-filebeat.html`,
          elasticsearchModule: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-module-elasticsearch.html`,
          elasticsearchOutput: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html`,
          startup: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-starting.html`,
          exportedFields: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/exported-fields.html`,
        },
        auditbeat: {
          base: `${ELASTIC_WEBSITE_URL}guide/en/beats/auditbeat/${DOC_LINK_VERSION}`,
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
        runtimeFields: `${ELASTICSEARCH_DOCS}runtime.html`,
        scriptedFields: {
          scriptFields: `${ELASTICSEARCH_DOCS}search-request-script-fields.html`,
          scriptAggs: `${ELASTICSEARCH_DOCS}search-aggregations.html#_values_source`,
          painless: `${ELASTICSEARCH_DOCS}modules-scripting-painless.html`,
          painlessApi: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-api-reference.html`,
          painlessLangSpec: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-lang-spec.html`,
          painlessSyntax: `${ELASTICSEARCH_DOCS}modules-scripting-painless-syntax.html`,
          painlessWalkthrough: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-walkthrough.html`,
          painlessLanguage: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-lang-spec.html`,
          luceneExpressions: `${ELASTICSEARCH_DOCS}modules-scripting-expression.html`,
        },
        indexPatterns: {
          loadingData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/tutorial-load-dataset.html`,
          introduction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index-patterns.html`,
        },
        addData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/connect-to-elasticsearch.html`,
        kibana: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index.html`,
        elasticsearch: {
          mapping: `${ELASTICSEARCH_DOCS}mapping.html`,
          remoteClusters: `${ELASTICSEARCH_DOCS}modules-remote-clusters.html`,
          remoteClustersProxy: `${ELASTICSEARCH_DOCS}modules-remote-clusters.html#proxy-mode`,
          remoteClusersProxySettings: `${ELASTICSEARCH_DOCS}modules-remote-clusters.html#remote-cluster-proxy-settings`,
          scriptParameters: `${ELASTICSEARCH_DOCS}modules-scripting-using.html#prefer-params`,
          transportSettings: `${ELASTICSEARCH_DOCS}modules-transport.html`,
        },
        siem: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/index.html`,
          gettingStarted: `${ELASTIC_WEBSITE_URL}guide/en/security/${DOC_LINK_VERSION}/index.html`,
        },
        query: {
          eql: `${ELASTICSEARCH_DOCS}eql.html`,
          luceneQuerySyntax: `${ELASTICSEARCH_DOCS}query-dsl-query-string-query.html#query-string-syntax`,
          queryDsl: `${ELASTICSEARCH_DOCS}query-dsl.html`,
          kueryQuerySyntax: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kuery-query.html`,
        },
        date: {
          dateMath: `${ELASTICSEARCH_DOCS}common-options.html#date-math`,
        },
        management: {
          kibanaSearchSettings: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/advanced-options.html#kibana-search-settings`,
          dashboardSettings: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/advanced-options.html#kibana-dashboard-settings`,
          visualizationSettings: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/advanced-options.html#kibana-visualization-settings`,
        },
        ml: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/index.html`,
          aggregations: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-aggregation.html`,
          anomalyDetection: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/xpack-ml.html`,
          anomalyDetectionJobs: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-jobs.html`,
          anomalyDetectionJobTips: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/create-jobs.html#job-tips`,
          calendars: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-calendars.html`,
          classificationEvaluation: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-classification`,
          customRules: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-rules.html`,
          customUrls: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-configuring-url.html`,
          dataFrameAnalytics: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics.html`,
          featureImportance: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-feature-importance.html`,
          outlierDetectionRoc: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-roc`,
          regressionEvaluation: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-regression-evaluation`,
          classificationAucRoc: `${ELASTIC_WEBSITE_URL}guide/en/machine-learning/${DOC_LINK_VERSION}/ml-dfanalytics-evaluate.html#ml-dfanalytics-class-aucroc`,
        },
        transforms: {
          guide: `${ELASTICSEARCH_DOCS}transforms.html`,
        },
        visualize: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/dashboard.html`,
          timelionDeprecation: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/dashboard.html#timelion-deprecation`,
          lens: `${ELASTIC_WEBSITE_URL}what-is/kibana-lens`,
          lensPanels: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/dashboard.html#create-panels-with-lens`,
          maps: `${ELASTIC_WEBSITE_URL}maps`,
        },
        observability: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/observability/${DOC_LINK_VERSION}/index.html`,
        },
        alerting: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/managing-alerts-and-actions.html`,
          actionTypes: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/action-types.html`,
          emailAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/email-action-type.html`,
          generalSettings: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-action-settings-kb.html#general-alert-action-settings`,
          indexAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index-action-type.html`,
          indexThreshold: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alert-types.html#alert-type-index-threshold`,
          pagerDutyAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/pagerduty-action-type.html`,
          preconfiguredConnectors: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/pre-configured-action-types-and-connectors.html`,
          serviceNowAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/servicenow-action-type.html`,
          setupPrerequisites: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/alerting-getting-started.html#alerting-setup-prerequisites`,
          slackAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/slack-action-type.html`,
          teamsAction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/teams-action-type.html`,
        },
        maps: {
          guide: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/maps.html`,
        },
        monitoring: {
          alertsCluster: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/cluster-alerts.html`,
          alertsKibana: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-alerts.html`,
          alertsKibanaCpuThreshold: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-cpu-threshold`,
          alertsKibanaDiskThreshold: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-disk-usage-threshold`,
          alertsKibanaJvmThreshold: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-jvm-memory-threshold`,
          alertsKibanaMissingData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-alerts.html#kibana-alerts-missing-monitoring-data`,
          metricbeatBlog: `${ELASTIC_WEBSITE_URL}blog/external-collection-for-elastic-stack-monitoring-is-now-available-via-metricbeat`,
          monitorElasticsearch: `${ELASTICSEARCH_DOCS}configuring-metricbeat.html`,
          monitorKibana: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/monitoring-metricbeat.html`,
          monitorLogstash: `${ELASTIC_WEBSITE_URL}guide/en/logstash/${DOC_LINK_VERSION}/monitoring-with-metricbeat.html`,
          troubleshootKibana: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/monitor-troubleshooting.html`,
        },
        security: {
          apiKeyServiceSettings: `${ELASTICSEARCH_DOCS}security-settings.html#api-key-service-settings`,
          clusterPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-cluster`,
          elasticsearchSettings: `${ELASTICSEARCH_DOCS}security-settings.html`,
          elasticsearchEnableSecurity: `${ELASTICSEARCH_DOCS}get-started-enable-security.html`,
          indicesPrivileges: `${ELASTICSEARCH_DOCS}security-privileges.html#privileges-list-indices`,
          kibanaTLS: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/configuring-tls.html`,
          kibanaPrivileges: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kibana-privileges.html`,
          mappingRoles: `${ELASTICSEARCH_DOCS}mapping-roles.html`,
          mappingRolesFieldRules: `${ELASTICSEARCH_DOCS}role-mapping-resources.html#mapping-roles-rule-field`,
          runAsPrivilege: `${ELASTICSEARCH_DOCS}security-privileges.html#_run_as_privilege`,
        },
        watcher: {
          jiraAction: `${ELASTICSEARCH_DOCS}actions-jira.html`,
          pagerDutyAction: `${ELASTICSEARCH_DOCS}actions-pagerduty.html`,
          slackAction: `${ELASTICSEARCH_DOCS}actions-slack.html`,
          ui: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/watcher-ui.html`,
        },
        ccs: {
          guide: `${ELASTICSEARCH_DOCS}modules-cross-cluster-search.html`,
        },
        apis: {
          createIndex: `${ELASTICSEARCH_DOCS}indices-create-index.html`,
          createSnapshotLifecyclePolicy: `${ELASTICSEARCH_DOCS}slm-api-put-policy.html`,
          createRoleMapping: `${ELASTICSEARCH_DOCS}security-api-put-role-mapping.html`,
          createRoleMappingTemplates: `${ELASTICSEARCH_DOCS}security-api-put-role-mapping.html#_role_templates`,
          createApiKey: `${ELASTICSEARCH_DOCS}security-api-create-api-key.html`,
          createPipeline: `${ELASTICSEARCH_DOCS}put-pipeline-api.html`,
          createTransformRequest: `${ELASTICSEARCH_DOCS}put-transform.html#put-transform-request-body`,
          executeWatchActionModes: `${ELASTICSEARCH_DOCS}watcher-api-execute-watch.html#watcher-api-execute-watch-action-mode`,
          indexExists: `${ELASTICSEARCH_DOCS}indices-exists.html`,
          openIndex: `${ELASTICSEARCH_DOCS}indices-open-close.html`,
          putComponentTemplate: `${ELASTICSEARCH_DOCS}indices-component-template.html`,
          painlessExecute: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html`,
          painlessExecuteAPIContexts: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-execute-api.html#_contexts`,
          putComponentTemplateMetadata: `${ELASTICSEARCH_DOCS}indices-component-template.html#component-templates-metadata`,
          putWatch: `${ELASTICSEARCH_DOCS}/watcher-api-put-watch.html`,
          updateTransform: `${ELASTICSEARCH_DOCS}update-transform.html`,
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
    };
    readonly auditbeat: {
      readonly base: string;
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
    readonly runtimeFields: string;
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
    readonly indexPatterns: {
      readonly loadingData: string;
      readonly introduction: string;
    };
    readonly addData: string;
    readonly kibana: string;
    readonly elasticsearch: Record<string, string>;
    readonly siem: {
      readonly guide: string;
      readonly gettingStarted: string;
    };
    readonly query: {
      readonly eql: string;
      readonly luceneQuerySyntax: string;
      readonly queryDsl: string;
      readonly kueryQuerySyntax: string;
    };
    readonly date: {
      readonly dateMath: string;
    };
    readonly management: Record<string, string>;
    readonly ml: Record<string, string>;
    readonly transforms: Record<string, string>;
    readonly visualize: Record<string, string>;
    readonly apis: Readonly<{
      createIndex: string;
      createSnapshotLifecyclePolicy: string;
      createRoleMapping: string;
      createRoleMappingTemplates: string;
      createApiKey: string;
      createPipeline: string;
      createTransformRequest: string;
      executeWatchActionModes: string;
      indexExists: string;
      openIndex: string;
      putComponentTemplate: string;
      painlessExecute: string;
      painlessExecuteAPIContexts: string;
      putComponentTemplateMetadata: string;
      putWatch: string;
      updateTransform: string;
    }>;
    readonly observability: Record<string, string>;
    readonly alerting: Record<string, string>;
    readonly maps: Record<string, string>;
    readonly monitoring: Record<string, string>;
    readonly security: Readonly<{
      apiKeyServiceSettings: string;
      clusterPrivileges: string;
      elasticsearchSettings: string;
      elasticsearchEnableSecurity: string;
      indicesPrivileges: string;
      kibanaTLS: string;
      kibanaPrivileges: string;
      mappingRoles: string;
      mappingRolesFieldRules: string;
      runAsPrivilege: string;
    }>;
    readonly watcher: Record<string, string>;
    readonly ccs: Record<string, string>;
  };
}
