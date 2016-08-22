const elasticsearch = require('elasticsearch');
const _ = require('lodash');
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
const util = require('util');
const url = require('url');
const callWithRequest = require('./call_with_request');

module.exports = function (server) {
  const config = server.config();

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
      pingTimeout: config.get('elasticsearch.pingTimeout'),
      requestTimeout: config.get('elasticsearch.requestTimeout'),
      keepAlive: true,
      auth: true
    });

    const uri = url.parse(options.url);

    let authorization;
    if (options.auth && options.username && options.password) {
      uri.auth = util.format('%s:%s', options.username, options.password);
    }

    const ssl = { rejectUnauthorized: options.verifySsl };
    if (options.clientCrt && options.clientKey) {
      ssl.cert = readFile(options.clientCrt);
      ssl.key = readFile(options.clientKey);
    }
    if (options.ca) {
      ssl.ca = options.ca.map(readFile);
    }

    const host = {
      host: uri.hostname,
      port: uri.port,
      protocol: uri.protocol,
      path: uri.pathname,
      auth: uri.auth,
      query: uri.query,
      headers: config.get('elasticsearch.customHeaders')
    };

    return new elasticsearch.Client({
      host,
      ssl,
      plugins: options.plugins,
      apiVersion: options.apiVersion,
      keepAlive: options.keepAlive,
      pingTimeout: options.pingTimeout,
      requestTimeout: options.requestTimeout,
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

  const client = createClient();
  server.on('close', _.bindKey(client, 'close'));

  const noAuthClient = createClient({ auth: false });
  server.on('close', _.bindKey(noAuthClient, 'close'));

  server.expose('client', client);
  server.expose('createClient', createClient);
  server.expose('callWithRequestFactory', callWithRequest);
  server.expose('callWithRequest', callWithRequest(noAuthClient));
  server.expose('errors', elasticsearch.errors);

  return client;

};
