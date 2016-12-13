import _ from 'lodash';
import Promise from 'bluebird';
import Boom from 'boom';
import toPath from 'lodash/internal/toPath';
import filterHeaders from './filter_headers';

module.exports = (server, client) => {
  return (req, endpoint, clientParams = {}, options = {}) => {
    const wrap401Errors = options.wrap401Errors !== false;
    const filteredHeaders = filterHeaders(req.headers, server.config().get('elasticsearch.requestHeadersWhitelist'));
    _.set(clientParams, 'headers', filteredHeaders);
    const path = toPath(endpoint);
    const api = _.get(client, path);
    let apiContext = _.get(client, path.slice(0, -1));
    if (_.isEmpty(apiContext)) {
      apiContext = client;
    }
    if (!api) throw new Error(`callWithRequest called with an invalid endpoint: ${endpoint}`);
    return api.call(apiContext, clientParams)
      .catch((err) => {
        if (!wrap401Errors || err.statusCode !== 401) {
          return Promise.reject(err);
        }

        const boomError = Boom.wrap(err, err.statusCode);
        const wwwAuthHeader = _.get(err, 'body.error.header[WWW-Authenticate]');
        boomError.output.headers['WWW-Authenticate'] = wwwAuthHeader || 'Basic realm="Authorization Required"';
        throw boomError;
      });
  };
};
