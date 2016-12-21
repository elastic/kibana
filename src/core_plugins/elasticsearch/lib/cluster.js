import elasticsearch from 'elasticsearch';
import { get, set, isEmpty, cloneDeep } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Boom from 'boom';

import createClient from './create_client';
import filterHeaders from './filter_headers';

export default class Cluster {
  constructor(config) {
    this._config = Object.assign({}, config);
    this.errors = elasticsearch.errors;

    createClients.call(this);

    return this;
  }

  /**
   * callWithRequest
   *
   * Performs a call to ES, passing through whitelisted headers in the request
   *
   * The whitelisted headers are defined in the config under _requestHeadersWhitelist_
   *
   * @param {Object|undefined} req - The request object
   * @param {string} endpoint
   * @param {Object} clientParams
   * @param {Object} options
   * @param {boolean} options.wrap401Errors
   * @returns {Promise}
   */
  callWithRequest = (req = {}, endpoint, clientParams = {}, options = {}) => {
    if (req.headers) {
      const filteredHeaders = filterHeaders(req.headers, this.config('requestHeadersWhitelist'));
      set(clientParams, 'headers', filteredHeaders);
    }

    return callAPI(this._noAuthClient, endpoint, clientParams, options);
  }

  /**
   * callWithInternalUser
   *
   * Performs a call to ES using the credentials in kibana.yml
   *
   * @param {string} endpoint
   * @param {Object} clientParams
   * @param {Object} options
   * @returns {Promise}
   */

  callWithInternalUser = (endpoint, clientParams = {}, options = {}) => {
    return callAPI(this._client, endpoint, clientParams, options);
  }

  config = (path) => {
    return cloneDeep(path ? get(this._config, path) : this._config);
  }

  addClientPlugins(plugins = []) {
    this.close(); // close existing client connections

    if (Array.isArray(this._config.plugins)) {
      this._config.plugins = this._config.plugins.concat(plugins);
    } else {
      this._config.plugins = plugins;
    }

    createClients.call(this);
  }

  close() {
    if (this._client) {
      this._client.close();
    }

    if (this._noAuthClient) {
      this._noAuthClient.close();
    }
  }
}

function callAPI(client, endpoint, clientParams = {}, options = {}) {
  const wrap401Errors = options.wrap401Errors !== false;
  const clientPath = toPath(endpoint);
  const api = get(client, clientPath);

  let apiContext = get(client, clientPath.slice(0, -1));
  if (isEmpty(apiContext)) {
    apiContext = client;
  }

  if (!api) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  return api.call(apiContext, clientParams).catch((err) => {
    if (!wrap401Errors || err.statusCode !== 401) {
      return Promise.reject(err);
    }

    const boomError = Boom.wrap(err, err.statusCode);
    const wwwAuthHeader = get(err, 'body.error.header[WWW-Authenticate]');
    boomError.output.headers['WWW-Authenticate'] = wwwAuthHeader || 'Basic realm="Authorization Required"';

    throw boomError;
  });
}

function createClients() {
  this._client = createClient(this.config());
  this._noAuthClient = createClient(Object.assign({}, this.config(), { auth: false }));
}
