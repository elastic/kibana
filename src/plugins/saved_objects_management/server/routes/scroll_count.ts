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
import { IRouter, SavedObjectsFindOptions } from 'src/core/server';
import { findAll } from '../lib';

export const registerScrollForCountRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/kibana/management/saved_objects/scroll/counts',
      validate: {
        body: schema.object({
          typesToInclude: schema.arrayOf(schema.string()),
          searchString: schema.maybe(schema.string()),
          references: schema.maybe(
            schema.arrayOf(
              schema.object({
                type: schema.string(),
                id: schema.string(),
              })
            )
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { client } = context.core.savedObjects;

      const findOptions: SavedObjectsFindOptions = {
        type: req.body.typesToInclude,
        perPage: 1000,
      };
      if (req.body.searchString) {
        findOptions.search = `${req.body.searchString}*`;
        findOptions.searchFields = ['title'];
      }
      if (req.body.references) {
        findOptions.hasReference = req.body.references;
        findOptions.hasReferenceOperator = 'OR';
      }

      const objects = await findAll(client, findOptions);

      const counts = objects.reduce((accum, result) => {
        const type = result.type;
        accum[type] = accum[type] || 0;
        accum[type]++;
        return accum;
      }, {} as Record<string, number>);

      for (const type of req.body.typesToInclude) {
        if (!counts[type]) {
          counts[type] = 0;
        }
      }

      return res.ok({
        body: counts,
      });
    })
  );
};
