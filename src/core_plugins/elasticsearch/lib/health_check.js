import _ from 'lodash';
import Promise from 'bluebird';
import elasticsearch from 'elasticsearch';
import kibanaVersion from './kibana_version';
import { ensureEsVersion } from './ensure_es_version';
import { MigrationStatus } from '@kbn/migrations';

const NoConnections = elasticsearch.errors.NoConnections;

export default function (plugin, server) {
  const config = server.config();
  const callAdminAsKibanaUser = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const REQUEST_DELAY = config.get('elasticsearch.healthCheck.delay');

  plugin.status.yellow('Waiting for Elasticsearch');
  function waitForPong(callWithInternalUser, url) {
    return callWithInternalUser('ping').catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;
      plugin.status.red(`Unable to connect to Elasticsearch at ${url}.`);

      return Promise.delay(REQUEST_DELAY).then(waitForPong.bind(null, callWithInternalUser, url));
    });
  }

  function waitUntilReady() {
    return new Promise((resolve) => {
      plugin.status.once('green', resolve);
    });
  }

  function waitForEsVersion() {
    return ensureEsVersion(server, kibanaVersion.get()).catch(err => {
      plugin.status.red(err);
      return Promise.delay(REQUEST_DELAY).then(waitForEsVersion);
    });
  }

  function waitForIndexMigration() {
    const errorDescription = (err) => `Kibana index migration error: ${_.get(err, 'index.error.reason', JSON.stringify(err))}`;
    const retryMigration = (color, message) => {
      plugin.status[color](message);
      return Promise.delay(REQUEST_DELAY).then(waitForIndexMigration);
    };

    return server.migrations()
      .migrate()
      .then(({ status }) => status === MigrationStatus.migrated ? true : retryMigration('yellow', `Kibana index is ${status}`))
      .catch(err => retryMigration('red', errorDescription(err)));
  }

  function setGreenStatus() {
    return plugin.status.green('Ready');
  }

  function check() {
    const healthCheck =
      waitForPong(callAdminAsKibanaUser, config.get('elasticsearch.url'))
        .then(waitForEsVersion)
        .then(waitForIndexMigration);

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
