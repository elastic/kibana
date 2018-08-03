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

import { Router } from '../http';
import { LoggerFactory } from '../logging';
import { ElasticsearchService } from './elasticsearch_service';

export function registerElasticsearchRoutes(
  router: Router,
  logger: LoggerFactory,
  service: ElasticsearchService
) {
  const log = logger.get('elasticsearch', 'routes');

  log.info('creating elasticsearch api');

  router.get(
    {
      path: '/:field',
      validate: schema => ({
        params: schema.object({
          field: schema.string(),
        }),
        query: schema.object({
          key: schema.maybe(schema.string()),
        }),
      }),
    },
    async (req, res) => {
      // WOHO! Both of these are typed!
      log.info(`field param: ${req.params.field}`);
      log.info(`query param: ${req.query.key}`);

      log.info('request received on [data] cluster');

      const cluster = await service.getScopedDataClient(req.headers);

      log.info('got scoped [data] cluster, now calling it');

      const response = cluster.call('search', {});

      return res.ok({
        params: req.params,
        query: req.query,
        total_count: response.hits.total,
      });
    }
  );

  return router;
}
