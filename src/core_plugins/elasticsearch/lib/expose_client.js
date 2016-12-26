import elasticsearch from 'elasticsearch';
import _ from 'lodash';
import Bluebird from 'bluebird';
const readFile = (file) => require('fs').readFileSync(file, 'utf8');
import util from 'util';
import url from 'url';
import callWithRequest from './call_with_request';
import filterHeaders from './filter_headers';

module.exports = function (server) {
  const config = server.config();

  class ElasticsearchClientLogging {
    error(err) {
      server.log(['error', 'elasticsearch'], err);
    }
    warning(message) {
      server.log(['warning', 'elasticsearch'], message);
    }
    info() {}
    debug() {}
    trace() {}
    close() {}
  }

  function createClient(options) {
    options = _.defaults(options || {}, {
      url: config.get('elasticsearch.url'),
      username: config.get('elasticsearch.username'),
      password: config.get('elasticsearch.password'),
      sslVerificationMode: config.get('elasticsearch.ssl.verificationMode'),
      clientCrt: config.get('elasticsearch.ssl.certificate'),
      clientKey: config.get('elasticsearch.ssl.key'),
      clientKeyPassphrase: config.get('elasticsearch.ssl.keyPassphrase'),
      ca: config.get('elasticsearch.ssl.certificateAuthorities'),
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

    const ssl = { };

    switch (options.sslVerificationMode) {
      case 'none':
        ssl.rejectUnauthorized = false;
        break;
      case 'certificate':
        ssl.rejectUnauthorized = true;

        // by default, NodeJS is checking the server identify
        ssl.checkServerIdentity = _.noop;
        break;
      case 'full':
        ssl.rejectUnauthorized = true;
        break;
      default:
        throw new Error(`Unknown ssl verificationMode: ${options.sslVerificationMode}`);
    }

    if (options.clientCrt && options.clientKey) {
      ssl.cert = readFile(options.clientCrt);
      ssl.key = readFile(options.clientKey);
      ssl.passphrase = options.clientKeyPassphrase;
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
      defer: function () {
        return Bluebird.defer();
      },
      log: ElasticsearchClientLogging
    });
  }

  const client = createClient();
  server.on('close', _.bindKey(client, 'close'));

  const noAuthClient = createClient({ auth: false });
  server.on('close', _.bindKey(noAuthClient, 'close'));

  server.expose('ElasticsearchClientLogging', ElasticsearchClientLogging);
  server.expose('client', client);
  server.expose('createClient', createClient);
  server.expose('callWithRequestFactory', _.partial(callWithRequest, server));
  server.expose('callWithRequest', callWithRequest(server, noAuthClient));
  server.expose('filterHeaders', filterHeaders);
  server.expose('errors', elasticsearch.errors);

  return client;

};
