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

import { wrap as wrapError } from 'boom';

const getClusterUuid = async callCluster => {
  const { cluster_uuid: uuid } = await callCluster('info', { filterPath: 'cluster_uuid', });
  return uuid;
};

/*
 * @param {Object} clients: clients.callCluster and clients.savedObjectsClient
 * @return {Object} data from usage stats collectors registered with CollectorSet
 */
const getUsage = (clients, server) => {
  const { collectorSet } = server.usage;
  return collectorSet.bulkFetchUsage(clients);
};

export function registerUsageApi(server) {
  server.route({
    path: '/api/usage',
    method: 'GET',
    async handler(req, reply) {
      const { server } = req;
      const { callWithRequest } = server.plugins.elasticsearch.getCluster('data');
      const callCluster = (...args) => callWithRequest(req, ...args); // All queries from HTTP API must use authentication headers from the request
      const savedObjectsClient = req.getSavedObjectsClient();

      try {
        const [ clusterUuid, usage ] = await Promise.all([
          getClusterUuid(callCluster),
          getUsage({ callCluster, savedObjectsClient }, server),
        ]);

        reply({
          cluster_uuid: clusterUuid,
          ...usage
        });
      } catch(err) {
        req.log(['error'], err); // FIXME doesn't seem to log anything useful if ES times out
        if (err.isBoom) {
          reply(err);
        } else {
          reply(wrapError(err, err.statusCode, err.message));
        }
      }
    }
  });
}
