var Promise = require('bluebird');
var isUpgradeable = require('./is_upgradeable');
var _ = require('lodash');
var format = require('util').format;

var utils = require('requirefrom')('src/utils');

module.exports = function (server) {
  var MAX_INTEGER = Math.pow(2, 53) - 1;

  var client = server.plugins.elasticsearch.client;
  var config = server.config();

  return function (response) {
    var newConfig = {};

    // Check to see if there are any doc. If not then we set the build number and id
    if (response.hits.hits.length === 0) {
      return client.create({
        index: config.get('kibana.index'),
        type: 'config',
        body: { buildNum: config.get('pkg.buildNum') },
        id: config.get('pkg.version')
      });
    }

    // if we already have a the current version in the index then we need to stop
    var devConfig = _.find(response.hits.hits, function currentVersion(hit) {
      return hit._id !== '@@version' && hit._id === config.get('pkg.version');
    });

    if (devConfig) return Promise.resolve();

    // Look for upgradeable configs. If none of them are upgradeable
    // then resolve with null.
    var body = _.find(response.hits.hits, isUpgradeable.bind(null, server));
    if (!body) return Promise.resolve();

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    body._source.buildNum = config.get('pkg.buildNum');

    server.log(['plugin', 'elasticsearch'], {
      tmpl: 'Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: body._id,
      newVersion: config.get('pkg.version')
    });

    return client.create({
      index: config.get('kibana.index'),
      type: 'config',
      body: body._source,
      id: config.get('pkg.version')
    });
  };
};

