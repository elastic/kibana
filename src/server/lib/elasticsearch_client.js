var config = require('../config');
var elasticsearch = require('elasticsearch');
var util = require('util');
var url = require('url');
var uri = url.parse(config.elasticsearch);
if (config.kibana.kibana_elasticsearch_username && config.kibana.kibana_elasticsearch_password) {
  uri.auth = util.format('%s:%s', config.kibana.kibana_elasticsearch_username, config.kibana.kibana_elasticsearch_password);
}
module.exports = new elasticsearch.Client({
  host: url.format(uri)
});

