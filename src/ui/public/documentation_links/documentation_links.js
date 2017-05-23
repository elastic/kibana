import { metadata } from '../metadata';

const urlVersion = metadata.branch;
const baseUrl = 'https://www.elastic.co/';

export const documentationLinks = {
  elasticsearch: {
    docs: `${baseUrl}guide/en/elasticsearch/reference/current`
  },
  beats: {
    docs: `${baseUrl}guide/en/beats/libbeat/current`
  },
  logstash: {
    docs: `${baseUrl}guide/en/logstash/current`
  },
  kibana: {
    docs: `${baseUrl}guide/en/kibana/current`
  },
  filebeat: {
    installation: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/filebeat-installation.html`,
    configuration: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/filebeat-configuration.html`,
    elasticsearchOutput: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/elasticsearch-output.html`,
    elasticsearchOutputAnchorParameters: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/elasticsearch-output.html#_parameters`,
    startup: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/filebeat-starting.html`,
    exportedFields: `${baseUrl}guide/en/beats/filebeat/${urlVersion}/exported-fields.html`
  },
  scriptedFields: {
    scriptFields: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/search-request-script-fields.html`,
    scriptAggs: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/search-aggregations.html#_values_source`,
    painless: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/modules-scripting-painless.html`,
    painlessApi: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/modules-scripting-painless.html#painless-api`,
    painlessSyntax: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/modules-scripting-painless-syntax.html`,
    luceneExpressions: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/modules-scripting-expression.html`
  },
  query: {
    luceneQuerySyntax: `${baseUrl}guide/en/elasticsearch/reference/${urlVersion}/query-dsl-query-string-query.html#query-string-syntax`
  },
  demoSite: 'http://demo.elastic.co',
  gettingStarted: `${baseUrl}products/kibana/getting-started-link`
};
