import _ from 'lodash';
import Promise from 'bluebird';
import elasticsearch from 'elasticsearch';
import exposeClient from './expose_client';
import migrateConfig from './migrate_config';
import createKibanaIndex from './create_kibana_index';
import checkEsVersion from './check_es_version';
import manageUuid from './manage_uuid';
const NoConnections = elasticsearch.errors.NoConnections;
import util from 'util';
const format = util.format;

const NO_INDEX = 'no_index';
const INITIALIZING = 'initializing';
const READY = 'ready';

const REQUEST_DELAY = 2500;

module.exports = function (plugin, server) {
  const config = server.config();
  const client = server.plugins.elasticsearch.client;
  const uuidManagement = manageUuid(server);

  plugin.status.yellow('Waiting for Elasticsearch');

  function waitForPong() {
    return client.ping().catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;

      plugin.status.red(format('Unable to connect to Elasticsearch at %s.', config.get('elasticsearch.url')));

      return Promise.delay(REQUEST_DELAY).then(waitForPong);
    });
  }

  // just figure out the current "health" of the es setup
  function getHealth() {
    return client.cluster.health({
      timeout: '5s', // tells es to not sit around and wait forever
      index: config.get('kibana.index'),
      ignore: [408]
    })
    .then(function (resp) {
      // if "timed_out" === true then elasticsearch could not
      // find any idices matching our filter within 5 seconds
      if (!resp || resp.timed_out) {
        return NO_INDEX;
      }

      // If status === "red" that means that index(es) were found
      // but the shards are not ready for queries
      if (resp.status === 'red') {
        return INITIALIZING;
      }

      return READY;
    });
  }

  function waitUntilReady() {
    return getHealth()
    .then(function (health) {
      if (health !== READY) {
        return Promise.delay(REQUEST_DELAY).then(waitUntilReady);
      }
    });
  }

  function waitForShards() {
    return getHealth()
    .then(function (health) {
      if (health === NO_INDEX) {
        plugin.status.yellow('No existing Kibana index found');
        return createKibanaIndex(server);
      }

      if (health === INITIALIZING) {
        plugin.status.red('Elasticsearch is still initializing the kibana index.');
        return Promise.delay(REQUEST_DELAY).then(waitForShards);
      }
    });
  }

  function setGreenStatus() {
    return plugin.status.green('Kibana index ready');
  }

  function check() {
    return waitForPong()
    .then(_.partial(checkEsVersion, server))
    .then(waitForShards)
    .then(uuidManagement)
    .then(setGreenStatus)
    .then(_.partial(migrateConfig, server))
    .catch(err => plugin.status.red(err));
  }

  let timeoutId = null;

  function scheduleCheck(ms) {
    if (timeoutId) return;

    const myId = setTimeout(function () {
      check().finally(function () {
        if (timeoutId === myId) startorRestartChecking();
      });
    }, ms);

    timeoutId = myId;
  }

  function startorRestartChecking() {
    scheduleCheck(stopChecking() ? REQUEST_DELAY : 1);
  }

  function stopChecking() {
    if (!timeoutId) return false;
    clearTimeout(timeoutId);
    timeoutId = null;
    return true;
  }

  return {
    waitUntilReady: waitUntilReady,
    run: check,
    start: startorRestartChecking,
    stop: stopChecking,
    isRunning: function () { return !!timeoutId; },
  };

};
