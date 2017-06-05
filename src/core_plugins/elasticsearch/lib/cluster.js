import elasticsearch from 'elasticsearch';
import { get, set, isEmpty, cloneDeep, pick } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Boom from 'boom';

import filterHeaders from './filter_headers';
import { parseConfig } from './parse_config';

export class Cluster {
  constructor(config) {
    this._config = Object.assign({}, config);
    this.errors = elasticsearch.errors;

    this._client = this.createClient();
    this._noAuthClient = this.createClient({ auth: false });

    return this;
  }

  callWithRequest = (req = {}, endpoint, clientParams = {}, options = {}) => {
    if (req.headers) {
      const filteredHeaders = filterHeaders(req.headers, this.getRequestHeadersWhitelist());
      set(clientParams, 'headers', filteredHeaders);
    }

    return callAPI(this._noAuthClient, endpoint, clientParams, options);
  }

  callWithInternalUser = (endpoint, clientParams = {}, options = {}) => {
    return callAPI(this._client, endpoint, clientParams, options);
  }

  getRequestHeadersWhitelist = () => getClonedProperty(this._config, 'requestHeadersWhitelist');

  getCustomHeaders = () => getClonedProperty(this._config, 'customHeaders');

  getRequestTimeout = () => getClonedProperty(this._config, 'requestTimeout');

  getUrl = () => getClonedProperty(this._config, 'url');

  getSsl = () => getClonedProperty(this._config, 'ssl');

  getClient = () => this._client;

  close() {
    if (this._client) {
      this._client.close();
    }

    if (this._noAuthClient) {
      this._noAuthClient.close();
    }
  }

  createClient = configOverrides => {
    const config = Object.assign({}, this._getClientConfig(), configOverrides);
    return new elasticsearch.Client(parseConfig(config));
  }

  _getClientConfig = () => {
    return getClonedProperties(this._config, [
      'url',
      'ssl',
      'username',
      'password',
      'customHeaders',
      'plugins',
      'apiVersion',
      'keepAlive',
      'pingTimeout',
      'requestTimeout',
      'log'
    ]);
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

function getClonedProperties(config, paths) {
  return cloneDeep(paths ? pick(config, paths) : config);
}

function getClonedProperty(config, path) {
  return cloneDeep(path ? get(config, path) : config);
}
