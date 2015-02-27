var Promise = require('bluebird');
var isUpgradeable = require('./isUpgradeable');
var config = require('../config');
var _ = require('lodash');
var client = require('./elasticsearch_client');
module.exports = function (response) {
  var newConfig = {};
  // Check to see if there are any doc. If not then we can assume
  // nothing needs to be done
  if (response.hits.hits.length === 0) return Promise.resolve();

  // Look for upgradeable configs. If none of them are upgradeable
  // then resolve with null.
  var body = _.find(response.hits.hits, isUpgradeable);
  if (!body) return Promise.resolve();

  // if the build number is still the template string (which it wil be in development)
  // then we need to set it to the max interger. Otherwise we will set it to the build num
  body._source.buildNum = (/^@@/.test(config.buildNum)) ?  Math.pow(2, 53) - 1 : parseInt(config.buildNum, 10);

  return client.create({
    index: config.kibana.kibana_index,
    type: 'config',
    body: body._source,
    id: config.package.version
  }).catch(function (err) {
    // Ignore document already exists exceptions for beta and snapshot upgrades.
    if (/DocumentAlreadyExistsException/.test(err.message) && /beta|snapshot/.test(config.package.version)) return;
    throw err;
  });
};
