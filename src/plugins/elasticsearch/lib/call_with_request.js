const _ = require('lodash');
const Promise = require('bluebird');
const Boom = require('boom');
module.exports = (client) => {
  return (req, endpoint, params = {}) => {
    if (req.headers.authorization) {
      _.set(params, 'headers.authorization', req.headers.authorization);
    }
    return _.get(client, endpoint)
      .call(client, params)
      .catch((err) => {
        if (err.status === 401) {
          const options = { realm: 'Authorization Required' };
          return Promise.reject(Boom.unauthorized(err.body, 'Basic', options));
        }
        return Promise.reject(err);
      });
  };
};
