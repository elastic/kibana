import elasticsearch from 'elasticsearch';
import { bindKey, partial, get, set, isEmpty, cloneDeep  } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Promise from 'bluebird';
import Boom from 'boom';

import createClient from './create_client';
import filterHeaders from './filter_headers';

export default class Cluster {
  constructor(config) {
    this._config = Object.assign({}, config);
    this.errors = elasticsearch.errors;

    this._client = this.createClient();
    this.callAsKibanaUser = this.callAsKibanaUserFactory(this._client);

    this._noAuthClient = this.createClient({ auth: false });
    this.callWithRequest = this.callWithRequestFactory(this._noAuthClient);

    return this;
  }

  /**
   * callAsKibanaUser
   *
   * Makes a call to ES using the credentials in kibana.yml
   *
   * @param {string} endpoint
   * @param {Object} clientParams
   * @param {Object} options
   * @param {boolean} options.wrap401Errors
   * @returns {Promise}
   */
  callAsKibanaUserFactory(client) {
    return partial(this.callWithRequestFactory(client), undefined);
  }

  callWithRequestFactory(client) {
    /**
     * callWithRequest
     *
     * Makes a call to ES, passing through whitelisted headers in the request
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
    return (req = {}, endpoint, clientParams = {}, options = {}) => {
      const wrap401Errors = options.wrap401Errors !== false;

      if (req.headers) {
        const filteredHeaders = filterHeaders(req.headers, this.config('requestHeadersWhitelist'));
        set(clientParams, 'headers', filteredHeaders);
      }

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
    };
  }

  config(path) {
    return cloneDeep(path ? get(this._config, path) : this._config);
  }

  createClient(options = {}) {
    return createClient(Object.assign({}, this.config(), options));
  }

  close() {
    this._client.close();
    this._noAuthClient.close();
  }
}
