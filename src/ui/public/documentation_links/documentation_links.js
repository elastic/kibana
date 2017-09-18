import { metadata } from '../metadata';

export const DOC_LINK_VERSION = metadata.branch;
export const ELASTIC_WEBSITE_URL = 'https://www.elastic.co/';

export const documentationLinks = {
  filebeat: {
    installation: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-installation.html`,
    configuration: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-configuration.html`,
    elasticsearchOutput: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html`,
    elasticsearchOutputAnchorParameters:
      `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/elasticsearch-output.html#_parameters`,
    startup: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/filebeat-starting.html`,
    exportedFields: `${ELASTIC_WEBSITE_URL}guide/en/beats/filebeat/${DOC_LINK_VERSION}/exported-fields.html`
  },
  scriptedFields: {
    scriptFields: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/search-request-script-fields.html`,
    scriptAggs: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/search-aggregations.html#_values_source`,
    painless: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/modules-scripting-painless.html`,
    painlessApi: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/modules-scripting-painless.html#painless-api`,
    painlessSyntax: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/modules-scripting-painless-syntax.html`,
    luceneExpressions: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/modules-scripting-expression.html`
  },
  indexPatterns: {
    loadingData: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/tutorial-load-dataset.html`,
    introduction: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/index-patterns.html`,
  },
  query: {
    luceneQuerySyntax:
      `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/query-dsl-query-string-query.html#query-string-syntax`,
    queryDsl: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/query-dsl.html`,
    kueryQuerySyntax: `${ELASTIC_WEBSITE_URL}guide/en/kibana/${DOC_LINK_VERSION}/kuery-query.html`,
  },
  date: {
    dateMath: `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}/common-options.html#date-math`
  },
};
