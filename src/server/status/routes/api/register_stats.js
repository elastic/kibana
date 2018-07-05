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

import Joi from 'joi';
import { wrapAuthConfig } from '../../wrap_auth_config';
import { setApiFieldNames } from '../../lib';

async function getExtended(req, server) {
  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('admin'); // admin cluster, get info on internal system
  const callCluster = (...args) => callWithRequest(req, ...args);

  let clusterUuid;
  try {
    const { cluster_uuid: uuid } = await callCluster('info', { filterPath: 'cluster_uuid', });
    clusterUuid = uuid;
  } catch (err) {
    clusterUuid = undefined; // fallback from anonymous access or auth failure, redundant for explicitness
  }

  let usage;
  try {
    const { collectorSet } = server.usage;
    const usageRaw = await collectorSet.bulkFetchUsage(callCluster);
    usage = collectorSet.summarizeStats(usageRaw);
  } catch (err) {
    usage = undefined;
  }

  return { clusterUuid, usage };
}

/*
 * API for Kibana meta info and accumulated operations stats
 * Including ?extended in the query string fetches Elasticsearch cluster_uuid and server.usage.collectorSet data
 * - Requests to set isExtended = true
 *      GET /api/stats?extended=true
 *      GET /api/stats?extended
 * - No value or 'false' is isExtended = false
 * - Any other value causes a statusCode 400 response (Bad Request)
 */
export function registerStatsApi(kbnServer, server, config, collector) {
  const wrapAuth = wrapAuthConfig(config.get('status.allowAnonymous'));
  server.route(
    wrapAuth({
      method: 'GET',
      path: '/api/stats',
      config: {
        validate: {
          query: {
            extended: Joi.string().valid('', 'true', 'false')
          }
        },
        tags: ['api'],
      },
      async handler(req, reply) {
        const { extended } = req.query;
        const isExtended = extended !== undefined && extended !== 'false';

        let clusterUuid;
        let usage;
        if (isExtended) {
          ({ clusterUuid, usage } = await getExtended(req, server));
        }

        const stats = setApiFieldNames({
          ...collector.getStats(kbnServer),
          cluster_uuid: clusterUuid,
          usage,
        });
        reply(stats);
      },
    })
  );
}
