const _ = require('lodash');
const Promise = require('bluebird');
const Boom = require('boom');
const getBasicAuthRealm = require('./get_basic_auth_realm');
const toPath = require('lodash/internal/toPath');

module.exports = (client) => {
  return (req, endpoint, params = {}) => {
    _.set(params, 'headers', req.headers);
    const path = toPath(endpoint);
    const api = _.get(client, path);
    let apiContext = _.get(client, path.slice(0, -1));
    if (_.isEmpty(apiContext)) {
      apiContext = client;
    }
    if (!api) throw new Error(`callWithRequest called with an invalid endpoint: ${endpoint}`);
    return api.call(apiContext, params)
      .catch((err) => {
        if (err.status === 401) {
          // TODO: The err.message is temporary until we have support for getting headers in the client.
          // Once we have that, we should be able to pass the contents of the WWW-Authenticate head to getRealm
          const realm = getBasicAuthRealm(err.message) || 'Authorization Required';
          const options = { realm: realm };
          return Promise.reject(Boom.unauthorized('Unauthorized', 'Basic', options));
        }
        return Promise.reject(err);
      });
  };
};
