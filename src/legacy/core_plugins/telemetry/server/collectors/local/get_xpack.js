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

import { TIMEOUT } from './constants';

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent of GET /_license?local=true .
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The response from Elasticsearch.
 */
export function getXPackLicense(callCluster) {
  return callCluster('transport.request', {
    method: 'GET',
    path: '/_license',
    query: {
      // Fetching the local license is cheaper than getting it from the master and good enough
      local: 'true'
    }
  })
    .then(({ license }) => license);
}

/**
 * Get the cluster stats from the connected cluster.
 *
 * This is the equivalent of GET /_xpack/usage?master_timeout=${TIMEOUT}
 *
 * Like any X-Pack related API, X-Pack must installed for this to work.
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise} The response from Elasticsearch equivalent to GET /_cluster/stats.
 */
export function getXPackUsage(callCluster) {
  return callCluster('transport.request', {
    method: 'GET',
    path: '/_xpack/usage',
    query: {
      master_timeout: TIMEOUT
    }
  });
}

/**
 * Combine the X-Pack responses into a single response as Monitoring does already.
 *
 * @param {Object} license The license returned from /_license
 * @param {Object} usage The usage details returned from /_xpack/usage
 * @return {Object} An object containing both the license and usage.
 */
export function handleXPack(license, usage) {
  return {
    license,
    stack_stats: {
      xpack: usage
    }
  };
}

/**
 * Combine all X-Pack requests as a singular request that is ignored upon failure.
 *
 * @param {function} callCluster The callWithInternalUser handler (exposed for testing)
 * @return {Promise}
 */
export function getXPack(callCluster) {
  return Promise.all([
    getXPackLicense(callCluster),
    getXPackUsage(callCluster),
  ])
    .then(([license, xpack]) => {
      return {
        license,
        xpack,
      };
    })
    .catch(() => { return {}; });
}

