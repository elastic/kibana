import elasticsearch from 'elasticsearch';
import { get, set, isEmpty, cloneDeep, pick } from 'lodash';
import toPath from 'lodash/internal/toPath';

import filterHeaders from './filter_headers';
import { parseConfig } from './parse_config';

export class Cluster {
  constructor(config) {
    this._config = {
      ...config
    };
    this.errors = elasticsearch.errors;

    this._clients = new Set();
    this._client = this.createClient();
    this._noAuthClient = this.createClient({ auth: false });

    return this;
  }

  callWithRequest = (req = {}, endpoint, clientParams = {}) => {
    if (req.headers) {
      const filteredHeaders = filterHeaders(req.headers, this.getRequestHeadersWhitelist());
      set(clientParams, 'headers', filteredHeaders);
    }

    return callAPI(this._noAuthClient, endpoint, clientParams);
  }

  callWithInternalUser = (endpoint, clientParams = {}) => {
    return callAPI(this._client, endpoint, clientParams);
  }

  getRequestHeadersWhitelist = () => getClonedProperty(this._config, 'requestHeadersWhitelist');

  getCustomHeaders = () => getClonedProperty(this._config, 'customHeaders');

  getRequestTimeout = () => getClonedProperty(this._config, 'requestTimeout');

  getUrl = () => getClonedProperty(this._config, 'url');

  getSsl = () => getClonedProperty(this._config, 'ssl');

  getClient = () => this._client;

  close() {
    for (const client of this._clients) {
      client.close();
    }

    this._clients.clear();
  }

  createClient = configOverrides => {
    const config = {
      ...this._getClientConfig(),
      ...configOverrides
    };

    const client = new elasticsearch.Client(parseConfig(config));
    this._clients.add(client);
    return client;
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

function callAPI(client, endpoint, clientParams = {}) {
  const clientPath = toPath(endpoint);
  const api = get(client, clientPath);

  let apiContext = get(client, clientPath.slice(0, -1));
  if (isEmpty(apiContext)) {
    apiContext = client;
  }

  if (!api) {
    throw new Error(`called with an invalid endpoint: ${endpoint}`);
  }

  return api.call(apiContext, clientParams);
}

function getClonedProperties(config, paths) {
  return cloneDeep(paths ? pick(config, paths) : config);
}

function getClonedProperty(config, path) {
  return cloneDeep(path ? get(config, path) : config);
}
