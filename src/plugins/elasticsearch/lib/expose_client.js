var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var readFile = (file) => require('fs').readFileSync(file, 'utf8');
var util = require('util');
var url = require('url');
var callWithRequest = require('./call_with_request');

module.exports = function (server) {
  var config = server.config();

  function createClient(options) {
    options = _.defaults(options || {}, {
      url: config.get('elasticsearch.url'),
      username: config.get('elasticsearch.username'),
      password: config.get('elasticsearch.password'),
      verifySsl: config.get('elasticsearch.ssl.verify'),
      clientCrt: config.get('elasticsearch.ssl.cert'),
      clientKey: config.get('elasticsearch.ssl.key'),
      ca: config.get('elasticsearch.ssl.ca'),
      apiVersion: config.get('elasticsearch.apiVersion'),
      keepAlive: true,
      auth: true
    });

    var uri = url.parse(options.url);

    var authorization;
    if (options.auth && options.username && options.password) {
      uri.auth = util.format('%s:%s', options.username, options.password);
    }

    var ssl = { rejectUnauthorized: options.verifySsl };
    if (options.clientCrt && options.clientKey) {
      ssl.cert = readFile(options.clientCrt);
      ssl.key = readFile(options.clientKey);
    }
    if (options.ca) {
      ssl.ca = options.ca.map(readFile);
    }

    return new elasticsearch.Client({
      host: url.format(uri),
      ssl: ssl,
      apiVersion: options.apiVersion,
      keepAlive: options.keepAlive,
      log: function () {
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
  }

  var client = createClient();
  server.on('close', _.bindKey(client, 'close'));

  var noAuthClient = createClient({ auth: false });
  server.on('close', _.bindKey(noAuthClient, 'close'));

  server.expose('client', client);
  server.expose('createClient', createClient);
  server.expose('callWithRequest', callWithRequest(noAuthClient));

  return client;

};
