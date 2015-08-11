let _ = require('lodash');
let btoa = require('btoa');
let Promise = require('bluebird');
let strategyMap = require('../../server/auth/lib/authStrategyMap');
let name = 'esProxy';

module.exports = (kibana) => new kibana.Plugin({
  require: ['elasticsearch'],
  init(server, options) {
    let config = server.config();
    if (!config.get('auth.enabled') || config.get('auth.strategy') !== name) return;
    let esPlugin = server.plugins.elasticsearch;

    strategyMap.set(name, {
      authenticate(request, username, password) {
        return isValid(username, password).then(() => ({
          username: username,
          password: password
        }));
      },

      validate(request, session) {
        // Is it overkill to make this request on every request?
        return isValid(session.username, session.password).then(() => {
          _.assign(request.headers, getAuthHeader(session.username, session.password));
          return true;
        });
      }
    });

    function isValid(username, password) {
      return Promise.try(() => {
        if (esPlugin.status.state !== 'green') throw new Error('Elasticsearch client is not ready.');

        return esPlugin.client.info({
          headers: getAuthHeader(username, password)
        });
      });
    }

    function getAuthHeader(username, password) {
      let auth = btoa(`${username}:${password}`);
      return {'Authorization': `Basic ${auth}`};
    }
  }
});