var Promise = require('bluebird');
var isUpgradeable = require('./is_upgradeable');
var pkg = require('../../../utils/closestPackageJson').getSync();
var _ = require('lodash');
var format = require('util').format;
module.exports = function (server) {

  var MAX_INTEGER = Math.pow(2, 53) - 1;

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
            buildNum: isProduction ? config.get('kibana.buildNum') : MAX_INTEGER
          },
          id: isProduction ? config.get('kibana.package.version') : '@@version'
        });
    }

    // if we already have a the current version in the index then we need to stop
    if (_.find(response.hits.hits, function currentVersion(hit) {
      return hit._id !== '@@version' &&
       hit._id === pkg.version;
    })) {
      return Promise.resolve();
    }

    // Look for upgradeable configs. If none of them are upgradeable
    // then resolve with null.
    var body = _.find(response.hits.hits, isUpgradeable.bind(null, server));
    if (!body) return Promise.resolve();

    // if the build number is still the template string (which it wil be in development)
    // then we need to set it to the max interger. Otherwise we will set it to the build num
    body._source.buildNum = MAX_INTEGER;
    if (!/^@@/.test(config.get('kibana.buildNum'))) {
      body._source.buildNum = parseInt(config.get('kibana.buildNum'), 10);
    }

    server.log('plugin', {
      tmpl: '[ elasticsearch ] Upgrade config from <%= prevVersion %> to <%= newVersion %>',
      prevVersion: body._id,
      newVersion: pkg.version
    });

    return client.create({
      index: config.get('kibana.index'),
      type: 'config',
      body: body._source,
      id: pkg.version
    });
  };
};

