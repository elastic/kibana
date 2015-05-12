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
      index: config.get('kibana.index')
    })
    .then(function (resp) {
      // if "timed_out" === true then elasticsearch could not
      // find any idices matching our filter within 5 seconds
      if (resp.timed_out) {
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

  var running = false;

  function runHealthCheck() {
    if (running) {
      setTimeout(function () {
        healthCheck()
        .then(runHealthCheck)
        .catch(function (err) {
          server.log('error', err);
          runHealthCheck();
        });
      }, 2500);
    }
  }

  function healthCheck() {
    return waitForPong()
    .then(checkEsVersion(server))
    .then(waitForShards)
    .then(migrateConfig(server));
  }

  return {
    isRunning: function () {
      return running;
    },
    run: function () {
      return healthCheck();
    },
    start: function () {
      running = true;
      return healthCheck().then(runHealthCheck, runHealthCheck);
    },
    stop: function () {
      running = false;
    }
  };

};
