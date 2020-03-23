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
import { importDashboards } from '../../../lib/import/import_dashboards';

export function importApi(server) {
  server.route({
    path: '/api/kibana/dashboards/import',
    method: ['POST'],
    config: {
      validate: {
        payload: Joi.object().keys({
          objects: Joi.array(),
          version: Joi.string(),
        }),
        query: Joi.object().keys({
          force: Joi.boolean().default(false),
          exclude: [Joi.string(), Joi.array().items(Joi.string())],
        }),
      },
      tags: ['api'],
    },

    handler: async req => {
      return await importDashboards(req);
    },
  });
}
