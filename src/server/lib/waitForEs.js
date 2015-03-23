var Promise = require('bluebird');
var NoConnections = require('elasticsearch').errors.NoConnections;

var client = require('./elasticsearch_client');
var logger = require('./logger');
var config = require('../config');

function waitForPong() {
  return client.ping({ requestTimeout: 1500 }).catch(function (err) {
    if (!(err instanceof NoConnections)) throw err;

    logger.info('Unable to connect to elasticsearch at %s. Retrying in 2.5 seconds.', config.elasticsearch);
    return Promise.delay(2500).then(waitForPong);
  });
}

function waitForShards() {
  return client.cluster.health({
    index: config.kibana.kibana_index
  })
  .then(function (resp) {
    switch (resp && resp.status) {
    case 'yellow':
    case 'green':
      logger.debug('Kibana index is available, starting');
      break;
    default:
      logger.info('Elasticsearch is still initializing... Trying again in 2.5 seconds.');
      return Promise.delay(2500).then(waitForShards);
    }
  });
}

module.exports = function () {
  return waitForPong().then(waitForShards);
};
