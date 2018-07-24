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

import url from 'url';
import Promise from 'bluebird';
import elasticsearch from 'elasticsearch';
import kibanaVersion from './kibana_version';
import { ensureEsVersion } from './ensure_es_version';

const NoConnections = elasticsearch.errors.NoConnections;

export default function (plugin, server) {
  const config = server.config();
  const callAdminAsKibanaUser = server.plugins.elasticsearch.getCluster('admin').callWithInternalUser;
  const REQUEST_DELAY = config.get('elasticsearch.healthCheck.delay');

  plugin.status.yellow('Waiting for Elasticsearch');
  function waitForPong(callWithInternalUser, elasticsearchUrl) {
    return callWithInternalUser('ping').catch(function (err) {
      if (!(err instanceof NoConnections)) throw err;

      const displayUrl = url.format({ ...url.parse(elasticsearchUrl), auth: undefined });
      plugin.status.red(`Unable to connect to Elasticsearch at ${displayUrl}.`);

      return Promise.delay(REQUEST_DELAY).then(waitForPong.bind(null, callWithInternalUser, elasticsearchUrl));
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

  function setGreenStatus() {
    return plugin.status.green('Ready');
  }

  function check() {
    const healthCheck =
      waitForPong(callAdminAsKibanaUser, config.get('elasticsearch.url'))
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
