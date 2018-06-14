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

import Boom from 'boom';
import Joi from 'joi';
import { findRelationships } from '../../../../lib/management/saved_objects/relationships';

export function registerRelationships(server) {
  server.route({
    path: '/api/kibana/management/saved_objects/relationships/{type}/{id}',
    method: ['GET'],
    config: {
      validate: {
        params: Joi.object().keys({
          type: Joi.string(),
          id: Joi.string(),
        }),
        query: Joi.object().keys({
          size: Joi.number(),
        })
      },
    },

    handler: async (req, reply) => {
      const type = req.params.type;
      const id = req.params.id;
      const size = req.query.size || 10;

      try {
        const response = await findRelationships(
          type,
          id,
          size,
          req.getSavedObjectsClient(),
        );

        reply(response);
      }
      catch (err) {
        reply(Boom.boomify(err, { statusCode: 500 }));
      }
    }
  });
}
