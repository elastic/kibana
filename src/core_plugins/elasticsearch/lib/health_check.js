import Promise from 'bluebird';
import elasticsearch from 'elasticsearch';
import kibanaVersion from './kibana_version';
import { ensureEsVersion } from './ensure_es_version';
import { ensureNotTribe } from './ensure_not_tribe';
import { ensureAllowExplicitIndex } from './ensure_allow_explicit_index';

const NoConnections = elasticsearch.errors.NoConnections;
import util from 'util';
const format = util.format;

export default function (plugin, server) {
  const config = server.config();
  const callAdminAsKibanaUser = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const callDataAsKibanaUser = server.plugins.elasticsearch.getCluster('data').callWithInternalUser;
  const REQUEST_DELAY = config.get('elasticsearch.healthCheck.delay');

  plugin.status.yellow('Waiting for Elasticsearch');
  function waitForPong(callWithInternalUser, url) {
    return callWithInternalUser('ping').catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;
      plugin.status.red(format('Unable to connect to Elasticsearch at %s.', url));

      return Promise.delay(REQUEST_DELAY).then(waitForPong.bind(null, callWithInternalUser, url));
    });
  }

  function waitUntilReady() {
    return callAdminAsKibanaUser('cluster.health', {
      timeout: '5s', // tells es to not sit around and wait forever
      index: config.get('kibana.index'),
      ignore: [408]
    })
    .then((resp) => {
      if (!resp || resp.timed_out || resp.status === 'red') {
        return Promise.delay(REQUEST_DELAY).then(waitUntilReady);
      }
    });
  }

  function waitForEsVersion() {
    return ensureEsVersion(server, kibanaVersion.get()).catch(err => {
      plugin.status.red(err);
      return Promise.delay(REQUEST_DELAY).then(waitForEsVersion);
    });
  }

  function setGreenStatus() {
    return plugin.status.green('Kibana index ready');
  }

  function check() {
    const healthCheck =
      waitForPong(callAdminAsKibanaUser, config.get('elasticsearch.url'))
      .then(waitForEsVersion)
      .then(() => ensureNotTribe(callAdminAsKibanaUser))
      .then(() => ensureAllowExplicitIndex(callAdminAsKibanaUser, config))
      .then(() => server.runSavedObjectsHealthCheck(plugin.status))
      .then(() => {
        const tribeUrl = config.get('elasticsearch.tribe.url');
        if (tribeUrl) {
          return waitForPong(callDataAsKibanaUser, tribeUrl)
          .then(() => ensureEsVersion(server, kibanaVersion.get(), callDataAsKibanaUser));
        }
      });

    return healthCheck
    .then(setGreenStatus)
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

  server.ext('onPreStop', (request, reply) => {
    stopChecking();
    reply();
  });

  return {
    waitUntilReady: waitUntilReady,
    run: check,
    start: startorRestartChecking,
    stop: stopChecking,
    isRunning: function () { return !!timeoutId; },
  };

}
