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

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';

export const registerCreateRoute = (router: IRouter) => {
  router.post(
    {
      path: '/{type}/{id?}',
      validate: {
        params: schema.object({
          type: schema.string(),
          id: schema.maybe(schema.string()),
        }),
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          attributes: schema.recordOf(schema.string(), schema.any()),
          migrationVersion: schema.maybe(schema.recordOf(schema.string(), schema.string())),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                name: schema.string(),
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { type, id } = req.params;
      const { overwrite } = req.query;
      const { attributes, migrationVersion, references } = req.body;

      const options = { id, overwrite, migrationVersion, references };
      const result = await context.core.savedObjects.client.create(type, attributes, options);
      return res.ok({ body: result });
    })
  );
};
