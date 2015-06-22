/**
 * A client that makes requests to Elasticsearch via a {{#crossLink "Transport"}}Transport{{/crossLink}}
 *
 * Initializing a client might look something like:
 *
 * ```
 * var client = new es.Client({
 *   hosts: [
 *     'es1.net:9200',
 *     {
 *       host: 'es2.net',
 *       port: 9200
 *     }
 *   ],
 *   sniffOnStart: true,
 *   log: {
 *     type: 'file',
 *     level: 'warning'
 *   }
 * });
 * ```
 *
 * @class Client
 * @constructor
 */

module.exports = Client;

var Transport = require('./transport');
var _ = require('./utils');

function Client(config) {
  config = config || {};

  if (config.__reused) {
    throw new Error('Do not reuse objects to configure the elasticsearch Client class: ' +
      'https://github.com/elasticsearch/elasticsearch-js/issues/33');
  } else {
    config.__reused = true;
  }

  function EsApiClient() {
    // our client will log minimally by default
    if (!config.hasOwnProperty('log')) {
      config.log = 'warning';
    }

    if (!config.hosts && !config.host) {
      config.host = 'http://localhost:9200';
    }

    this.close = function () {
      this.transport.close();
    };

    this.transport = new Transport(config);

    // instantiate the api's namespaces
    for (var i = 0; i < this._namespaces.length; i++) {
      this[this._namespaces[i]] = new this[this._namespaces[i]](this.transport);
    }

    delete this._namespaces;
  }

  EsApiClient.prototype = _.funcEnum(config, 'apiVersion', Client.apis, '1.4');
  if (!config.sniffEndpoint && EsApiClient.prototype === Client.apis['0.90']) {
    config.sniffEndpoint = '/_cluster/nodes';
  }

  return new EsApiClient();
}

Client.apis = require('./apis');