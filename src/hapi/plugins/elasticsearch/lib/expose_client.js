var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var fs = require('fs');
var util = require('util');
var url = require('url');

module.exports = function (server) {
  var config = server.config();
  var uri = url.parse(config.elasticsearch);
  var username = config.kibana.kibana_elasticsearch_username;
  var password = config.kibana.kibana_elasticsearch_password;
  var verify_ssl = config.kibana.verify_ssl;
  var client_crt = config.kibana.kibana_elasticsearch_client_crt;
  var client_key = config.kibana.kibana_elasticsearch_client_key;
  var ca = config.kibana.ca;

  if (username && password) {
    uri.auth = util.format('%s:%s', username, password);
  }

  var ssl = { rejectUnauthorized: verify_ssl };
  if (client_crt && client_key) {
    ssl.cert = fs.readFileSync(client_crt, 'utf8');
    ssl.key = fs.readFileSync(client_key, 'utf8');
  }
  if (ca) {
    ssl.ca = fs.readFileSync(ca, 'utf8');
  }

  var client = new elasticsearch.Client({
    host: url.format(uri),
    ssl: ssl,
    log: function (config) {
      this.error = function (err) {
        server.log(['error', 'elasticsearch'], err);
      };
      this.warning = function (message) {
        server.log(['warn', 'elasticsearch'], '[ elasticsearch ] ' + message);
      };
      this.info = _.noop;
      this.debug = _.noop;
      this.trace = _.noop;
      this.close = _.noop;
    }
  });

  server.expose('client', client);
  return client;

};
