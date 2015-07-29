var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var fs = require('fs');
var util = require('util');
var url = require('url');

module.exports = function (server) {
  var config = server.config();
  var uri = url.parse(config.get('elasticsearch.url'));
  var username = config.get('elasticsearch.username');
  var password = config.get('elasticsearch.password');
  var verify_ssl = config.get('elasticsearch.ssl.verify');
  var client_crt = config.get('elasticsearch.ssl.cert');
  var client_key = config.get('elasticsearch.ssl.key');
  var ca = config.get('elasticsearch.ssl.ca');

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
    apiVersion: '1.4',
    log: function (config) {
      this.error = function (err) {
        server.log(['error', 'elasticsearch'], err);
      };
      this.warning = function (message) {
        server.log(['warning', 'elasticsearch'], message);
      };
      this.info = _.noop;
      this.debug = _.noop;
      this.trace = _.noop;
      this.close = _.noop;
    }
  });

  server.on('close', _.bindKey(client, 'close'));
  server.expose('client', client);

  return client;

};
