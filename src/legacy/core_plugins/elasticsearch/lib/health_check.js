/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Promise from 'bluebird';
import kibanaVersion from './kibana_version';
import { ensureEsVersion } from './ensure_es_version';

export default function (plugin, server, requestDelay) {
  const adminCluster = server.plugins.elasticsearch.getCluster('admin');
  const NoConnections = adminCluster.errors.NoConnections;
  const callAdminAsKibanaUser = adminCluster.callWithInternalUser;

  plugin.status.yellow('Waiting for Elasticsearch');
  function waitForPong(callWithInternalUser) {
    return callWithInternalUser('ping').catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;
      plugin.status.red(`Unable to connect to Elasticsearch.`);
      return Promise.delay(requestDelay).then(waitForPong.bind(null, callWithInternalUser));
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
      return Promise.delay(requestDelay).then(waitForEsVersion);
    });
  }

  function setGreenStatus() {
    return plugin.status.green('Ready');
  }

  function check() {
    const healthCheck =
      waitForPong(callAdminAsKibanaUser)
        .then(waitForEsVersion);

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
    scheduleCheck(stopChecking() ? requestDelay : 1);
  }

  function stopChecking() {
    if (!timeoutId) return false;
    clearTimeout(timeoutId);
    timeoutId = null;
    return true;
  }

  server.ext('onPreStop', stopChecking);

  return {
    waitUntilReady: waitUntilReady,
    run: check,
    start: startorRestartChecking,
    stop: stopChecking,
    isRunning: function () { return !!timeoutId; },
  };
}
