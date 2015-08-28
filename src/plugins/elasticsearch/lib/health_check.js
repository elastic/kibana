var _ = require('lodash');
var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');
var exposeClient = require('./expose_client');
var migrateConfig = require('./migrate_config');
var createKibanaIndex = require('./create_kibana_index');
var checkEsVersion = require('./check_es_version');
var NoConnections = elasticsearch.errors.NoConnections;
var util = require('util');
var format = util.format;

module.exports = function (plugin, server) {
  var config = server.config();
  var client = server.plugins.elasticsearch.client;

  plugin.status.yellow('Waiting for Elasticsearch');

  function waitForPong() {
    return client.ping({ requestTimeout: 1500 }).catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;

      plugin.status.red(format('Unable to connect to Elasticsearch at %s. Retrying in 2.5 seconds.', config.get('elasticsearch.url')));

      return Promise.delay(2500).then(waitForPong);
    });
  }

  function waitForShards() {
    return client.cluster.health({
      timeout: '5s', // tells es to not sit around and wait forever
      index: config.get('kibana.index'),
      ignore: [408]
    })
    .then(function (resp) {
      // if "timed_out" === true then elasticsearch could not
      // find any idices matching our filter within 5 seconds
      if (!resp || resp.timed_out) {
        plugin.status.yellow('No existing Kibana index found');
        return createKibanaIndex(server);
      }

      // If status === "red" that means that index(es) were found
      // but the shards are not ready for queries
      if (resp.status === 'red') {
        plugin.status.red('Elasticsearch is still initializing the kibana index... Trying again in 2.5 second.');
        return Promise.delay(2500).then(waitForShards);
      }

      // otherwise we are g2g
      plugin.status.green('Kibana index ready');
    });
  }

  function check() {
    return waitForPong()
    .then(_.partial(checkEsVersion, server))
    .then(waitForShards)
    .then(_.partial(migrateConfig, server))
    .catch(err => plugin.status.red(err));
  }

  var timeoutId = null;

  function scheduleCheck(ms) {
    if (timeoutId) return;

    var myId = setTimeout(function () {
      check().finally(function () {
        if (timeoutId === myId) startorRestartChecking();
      });
    }, ms);

    timeoutId = myId;
  }

  function startorRestartChecking() {
    scheduleCheck(stopChecking() ? 2500 : 1);
  }

  function stopChecking() {
    if (!timeoutId) return false;
    clearTimeout(timeoutId);
    timeoutId = null;
    return true;
  }

  return {
    run: check,
    start: startorRestartChecking,
    stop: stopChecking,
    isRunning: function () { return !!timeoutId; },
  };

};
