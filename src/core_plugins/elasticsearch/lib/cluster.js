import elasticsearch from 'elasticsearch';
import { bindKey, partial, get, set, isEmpty } from 'lodash';
import toPath from 'lodash/internal/toPath';
import Promise from 'bluebird';
import Boom from 'boom';

import createClient from './create_client';
import filterHeaders from './filter_headers';

let client;
let noAuthClient;

export default class Cluster {
  constructor(config) {
    this.config = config;
    this.errors = elasticsearch.errors;

    client = this.createClient();
    this.callAsKibanaUser = this.callAsKibanaUserFactory(client);

    noAuthClient = this.createClient({ auth: false });
    this.callWithRequest = this.callWithRequestFactory(noAuthClient);

    return this;
  }

  callAsKibanaUserFactory(client) {
    return (endpoint, params = {}) => {
      const path = toPath(endpoint);
      const api = get(client, path);

      let apiContext = get(client, path.slice(0, -1));

      if (isEmpty(apiContext)) {
        apiContext = client;
      }

      if (!api) {
        throw new Error(`callWithRequest called with an invalid endpoint: ${endpoint}`);
      }

      return api.call(apiContext, params);
    };
  }

  callWithRequestFactory(client) {
    return (req, endpoint, clientParams = {}, options = {}) => {
      const wrap401Errors = options.wrap401Errors !== false;
      const filteredHeaders = filterHeaders(req.headers, this.config.requestHeadersWhitelist);
      set(clientParams, 'headers', filteredHeaders);
      const path = toPath(endpoint);
      const api = get(client, path);
      let apiContext = get(client, path.slice(0, -1));
      if (isEmpty(apiContext)) {
        apiContext = client;
      }
      if (!api) throw new Error(`callWithRequest called with an invalid endpoint: ${endpoint}`);
      return api.call(apiContext, clientParams)
        .catch((err) => {
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

  createClient(options = {}) {
    return createClient(Object.assign({}, this.config, options));
  }

  close() {
    client.close();
    noAuthClient.close();
  }
}
