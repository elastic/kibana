/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { metadata } from '../metadata';

/*
  WARNING: The links in this file are validated during the docs build. This is accomplished with some regex magic that
  looks for these particular constants. As a result, we should not add new constants or change the existing ones.
  If you absolutely must make a change, talk to Clinton Gormley first so he can update his Perl scripts.
 */
export const DOC_LINK_VERSION = metadata.branch;
export const ELASTIC_WEBSITE_URL = 'https://www.elastic.co/';
const ELASTIC_DOCS = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/`;

export const documentationLinks = {
  filebeat: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}`,
    installation: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-installation.html`,
    configuration: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-configuration.html`,
    elasticsearchOutput: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html`,
    startup: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-starting.html`,
    exportedFields: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/exported-fields.html`,
  },
  auditbeat: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/beats/auditbeat/${DOC_LINK_VERSION}`,
  },
  metricbeat: {
    base: `${ELASTIC_WEBSITE_URL}guide/en/beats/metricbeat/${DOC_LINK_VERSION}`,
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
    date_histogram: `${ELASTIC_DOCS}search-aggregations-bucket-datehistogram-aggregation.html`,
    date_range: `${ELASTIC_DOCS}search-aggregations-bucket-daterange-aggregation.html`,
    filter: `${ELASTIC_DOCS}search-aggregations-bucket-filter-aggregation.html`,
    filters: `${ELASTIC_DOCS}search-aggregations-bucket-filters-aggregation.html`,
    geohash_grid: `${ELASTIC_DOCS}search-aggregations-bucket-geohashgrid-aggregation.html`,
    histogram: `${ELASTIC_DOCS}search-aggregations-bucket-histogram-aggregation.html`,
    ip_range: `${ELASTIC_DOCS}search-aggregations-bucket-iprange-aggregation.html`,
    range: `${ELASTIC_DOCS}search-aggregations-bucket-range-aggregation.html`,
    significant_terms: `${ELASTIC_DOCS}search-aggregations-bucket-significantterms-aggregation.html`,
    terms: `${ELASTIC_DOCS}search-aggregations-bucket-terms-aggregation.html`,
    avg: `${ELASTIC_DOCS}search-aggregations-metrics-avg-aggregation.html`,
    avg_bucket: `${ELASTIC_DOCS}search-aggregations-pipeline-avg-bucket-aggregation.html`,
    max_bucket: `${ELASTIC_DOCS}search-aggregations-pipeline-max-bucket-aggregation.html`,
    min_bucket: `${ELASTIC_DOCS}search-aggregations-pipeline-min-bucket-aggregation.html`,
    sum_bucket: `${ELASTIC_DOCS}search-aggregations-pipeline-sum-bucket-aggregation.html`,
    cardinality: `${ELASTIC_DOCS}search-aggregations-metrics-cardinality-aggregation.html`,
    count: `${ELASTIC_DOCS}search-aggregations-metrics-valuecount-aggregation.html`,
    cumulative_sum: `${ELASTIC_DOCS}search-aggregations-metrics-sum-aggregation.html`,
    derivative: `${ELASTIC_DOCS}search-aggregations-pipeline-derivative-aggregation.html`,
    geo_bounds: `${ELASTIC_DOCS}search-aggregations-metrics-geobounds-aggregation.html`,
    geo_centroid: `${ELASTIC_DOCS}search-aggregations-metrics-geocentroid-aggregation.html`,
    max: `${ELASTIC_DOCS}search-aggregations-metrics-max-aggregation.html`,
    median: `${ELASTIC_DOCS}search-aggregations-metrics-percentile-aggregation.html`,
    min: `${ELASTIC_DOCS}search-aggregations-metrics-min-aggregation.html`,
    moving_avg: `${ELASTIC_DOCS}search-aggregations-pipeline-movavg-aggregation.html`,
    percentile_ranks: `${ELASTIC_DOCS}search-aggregations-metrics-percentile-rank-aggregation.html`,
    serial_diff: `${ELASTIC_DOCS}search-aggregations-pipeline-serialdiff-aggregation.html`,
    std_dev: `${ELASTIC_DOCS}search-aggregations-metrics-extendedstats-aggregation.html`,
    sum: `${ELASTIC_DOCS}search-aggregations-metrics-sum-aggregation.html`,
    top_hits: `${ELASTIC_DOCS}search-aggregations-metrics-top-hits-aggregation.html`,
  },
  scriptedFields: {
    scriptFields: `${ELASTIC_DOCS}search-request-script-fields.html`,
    scriptAggs: `${ELASTIC_DOCS}search-aggregations.html#_values_source`,
    painless: `${ELASTIC_DOCS}modules-scripting-painless.html`,
    painlessApi: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/painless/${DOC_LINK_VERSION}/painless-api-reference.html`,
    painlessSyntax: `${ELASTIC_DOCS}modules-scripting-painless-syntax.html`,
    luceneExpressions: `${ELASTIC_DOCS}modules-scripting-expression.html`,
  },
  indexPatterns: {
    loadingData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/tutorial-load-dataset.html`,
    introduction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index-patterns.html`,
  },
  kibana: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index.html`,
  siem: `${ELASTIC_WEBSITE_URL}guide/en/siem/guide/${DOC_LINK_VERSION}/index.html`,
  query: {
    luceneQuerySyntax: `${ELASTIC_DOCS}query-dsl-query-string-query.html#query-string-syntax`,
    queryDsl: `${ELASTIC_DOCS}query-dsl.html`,
    kueryQuerySyntax: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kuery-query.html`,
  },
  date: {
    dateMath: `${ELASTIC_DOCS}common-options.html#date-math`,
  },
};
