var config = require('../config');
var elasticsearch = require('elasticsearch');
var logger = require('./logger');
var _ = require('lodash');
var fs = require('fs');
var util = require('util');
var url = require('url');
var uri = url.parse(config.elasticsearch);
if (config.kibana.kibana_elasticsearch_username && config.kibana.kibana_elasticsearch_password) {
  uri.auth = util.format('%s:%s', config.kibana.kibana_elasticsearch_username, config.kibana.kibana_elasticsearch_password);
}
options = {
  host: url.format(uri),
  log: function (config) {
    this.error = function (err) {
      logger.error({ err: err });
    };
    this.warning = _.bindKey(logger, 'warn');
    this.info = _.noop;
    this.debug = _.noop;
    this.trace = _.noop;
    this.close = _.noop;
  }
}
if (config.kibana.kibana_elasticsearch_client_crt && config.kibana.kibana_elasticsearch_client_key) {
  options.ssl = {
    cert: fs.readFileSync(config.kibana.kibana_elasticsearch_client_crt , 'utf8'),
    key: fs.readFileSync(config.kibana.kibana_elasticsearch_client_key , 'utf8')
  }
}

module.exports = new elasticsearch.Client(options);

