var Promise = require('bluebird');
var isUpgradeable = require('./is_upgradeable');
var _ = require('lodash');
var format = require('util').format;
module.exports = function (server) {

  function getMaxInteger() {
    return Math.pow(2, 53) - 1;
  }

  var client = server.plugins.elasticsearch.client;
  var config = server.config();
  return function (response) {
    var newConfig = {};

    // Check to see if there are any doc. If not then we set the build number and id
    if (response.hits.hits.length === 0) {
      var isProduction = process.env.NODE_ENV === 'production';
      return client.create({
          index: config.get('kibana.index'),
          type: 'config',
          body: {
            buildNum: isProduction ? config.get('kibana.buildNum') : getMaxInteger()
          },
          id: isProduction ? config.get('kibana.package.version') : '@@version'
        });
    }

    // if we already have a the current version in the index then we need to stop
    if (_.find(response.hits.hits, function currentVersion(hit) {
      return hit._id !== '@@version' &&
       hit._id === config.get('kibana.package.version');
    })) {
      return Promise.resolve();
    }

    // Look for upgradeable configs. If none of them are upgradeable
    // then resolve with null.
    var body = _.find(response.hits.hits, isUpgradeable.bind(null, server));
    if (!body) return Promise.resolve();

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    body._source.buildNum = getMaxInteger();
    if (!/^@@/.test(config.get('kibana.buildNum'))) {
      body._source.buildNum = parseInt(config.get('kibana.buildNum'), 10);
    }

    var logMsg = format('[ elasticsearch ] Upgrade config from %s to %s', body._id, config.get('kibana.package.version'));
    server.log('plugin', logMsg);
    return client.create({
      index: config.get('kibana.index'),
      type: 'config',
      body: body._source,
      id: config.get('kibana.package.version')
    });
  };
};

