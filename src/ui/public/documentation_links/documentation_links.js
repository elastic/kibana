import { metadata } from '../metadata';

export const DOC_LINK_VERSION = metadata.branch;
export const ELASTIC_WEBSITE_URL = 'https://www.elastic.co/';
const AGG_DOC_BASE = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;

export const documentationLinks = {
  filebeat: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}`,
    installation: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-installation.html`,
    configuration: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-configuration.html`,
    elasticsearchOutput: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html`,
    elasticsearchOutputAnchorParameters:
      `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html#_parameters`,
    startup: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-starting.html`,
    exportedFields: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/exported-fields.html`
  },
  metricbeat: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}`
  },
  logstash: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/logstash/${DOC_LINK_VERSION}`
  },
  aggs: {
    date_histogram: `${AGG_DOC_BASE}search-aggregations-bucket-datehistogram-aggregation.html`,
    date_range: `${AGG_DOC_BASE}search-aggregations-bucket-daterange-aggregation.html`,
    filter: `${AGG_DOC_BASE}search-aggregations-bucket-filter-aggregation.html`,
    filters: `${AGG_DOC_BASE}search-aggregations-bucket-filters-aggregation.html`,
    geohash_grid: `${AGG_DOC_BASE}search-aggregations-bucket-geohashgrid-aggregation.html`,
    histogram: `${AGG_DOC_BASE}search-aggregations-bucket-histogram-aggregation.html`,
    ip_range: `${AGG_DOC_BASE}search-aggregations-bucket-iprange-aggregation.html`,
    range: `${AGG_DOC_BASE}search-aggregations-bucket-range-aggregation.html`,
    significant_terms: `${AGG_DOC_BASE}search-aggregations-bucket-significantterms-aggregation.html`,
    terms: `${AGG_DOC_BASE}search-aggregations-bucket-terms-aggregation.html`,
    avg: `${AGG_DOC_BASE}search-aggregations-metrics-avg-aggregation.html`,
    avg_bucket: `${AGG_DOC_BASE}search-aggregations-pipeline-avg-bucket-aggregation.html`,
    max_bucket: `${AGG_DOC_BASE}search-aggregations-pipeline-max-bucket-aggregation.html`,
    min_bucket: `${AGG_DOC_BASE}search-aggregations-pipeline-min-bucket-aggregation.html`,
    sum_bucket: `${AGG_DOC_BASE}search-aggregations-pipeline-sum-bucket-aggregation.html`,
    cardinality: `${AGG_DOC_BASE}search-aggregations-metrics-cardinality-aggregation.html`,
    count: `${AGG_DOC_BASE}search-aggregations-metrics-valuecount-aggregation.html`,
    cumulative_sum: `${AGG_DOC_BASE}search-aggregations-metrics-sum-aggregation.html`,
    derivative: `${AGG_DOC_BASE}search-aggregations-pipeline-derivative-aggregation.html`,
    geo_bounds: `${AGG_DOC_BASE}search-aggregations-metrics-geobounds-aggregation.html`,
    geo_centroid: `${AGG_DOC_BASE}search-aggregations-metrics-geocentroid-aggregation.html`,
    max: `${AGG_DOC_BASE}search-aggregations-metrics-max-aggregation.html`,
    median: `${AGG_DOC_BASE}search-aggregations-metrics-percentile-aggregation.html`,
    min: `${AGG_DOC_BASE}search-aggregations-metrics-min-aggregation.html`,
    moving_avg: `${AGG_DOC_BASE}search-aggregations-pipeline-movavg-aggregation.html`,
    percentile_ranks: `${AGG_DOC_BASE}search-aggregations-metrics-percentile-rank-aggregation.html`,
    serial_diff: `${AGG_DOC_BASE}search-aggregations-pipeline-serialdiff-aggregation.html`,
    std_dev: `${AGG_DOC_BASE}search-aggregations-metrics-extendedstats-aggregation.html`,
    sum: `${AGG_DOC_BASE}search-aggregations-metrics-sum-aggregationn.html`,
    top_hits: `${AGG_DOC_BASE}search-aggregations-metrics-top-hits-aggregation.html`,
  },
  scriptedFields: {
    scriptFields: `${AGG_DOC_BASE}search-request-script-fields.html`,
    scriptAggs: `${AGG_DOC_BASE}search-aggregations.html#_values_source`,
    painless: `${AGG_DOC_BASE}modules-scripting-painless.html`,
    painlessApi: `${AGG_DOC_BASE}modules-scripting-painless.html#painless-api`,
    painlessSyntax: `${AGG_DOC_BASE}modules-scripting-painless-syntax.html`,
    luceneExpressions: `${AGG_DOC_BASE}modules-scripting-expression.html`
  },
  indexPatterns: {
    loadingData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/tutorial-load-dataset.html`,
    introduction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index-patterns.html`,
  },
  query: {
    luceneQuerySyntax:
      `${AGG_DOC_BASE}query-dsl-query-string-query.html#query-string-syntax`,
    queryDsl: `${AGG_DOC_BASE}query-dsl.html`,
    kueryQuerySyntax: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kuery-query.html`,
  },
  date: {
    dateMath: `${AGG_DOC_BASE}common-options.html#date-math`
  },
};
