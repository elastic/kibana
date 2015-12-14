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

var ssl = { rejectUnauthorized: config.kibana.verify_ssl };

if (config.kibana.kibana_elasticsearch_client_crt && config.kibana.kibana_elasticsearch_client_key) {
  ssl.cert = fs.readFileSync(config.kibana.kibana_elasticsearch_client_crt, 'utf8');
  ssl.key = fs.readFileSync(config.kibana.kibana_elasticsearch_client_key, 'utf8');
}

if (config.kibana.ca) {
  ssl.ca = fs.readFileSync(config.kibana.ca, 'utf8');
}

// AWS.config.credentials = new AWS.EC2MetadataCredentials({
//   httpOptions: { timeout: 5000 } // 5 second timeout
// });

AWS.config.credentials = new AWS.EnvironmentCredentials('AWS');

module.exports = new elasticsearch.Client({
  host: url.format(uri),
  ssl: ssl,
  connectionClass: require('http-aws-es'),
  amazonES: {
    region: 'us-east-1',
      accessKey: 'AKID',
      secretKey: 'secret',
      credentials: new AWS.TemporaryCredentials()
   },
  pingTimeout: config.kibana.ping_timeout,
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
});
