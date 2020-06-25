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
import { IRouter, SavedObject } from 'src/core/server';
import { importDashboards } from '../lib';

export const registerImportRoute = (router: IRouter) => {
  router.post(
    {
      path: '/api/kibana/dashboards/import',
      validate: {
        body: schema.object({
          objects: schema.arrayOf(schema.recordOf(schema.string(), schema.any())),
          version: schema.string(),
        }),
        query: schema.object({
          force: schema.boolean({ defaultValue: false }),
          exclude: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
        }),
      },
      options: {
        tags: ['api'],
      },
    },
    async (ctx, req, res) => {
      const { client } = ctx.core.savedObjects;
      const objects = req.body.objects as SavedObject[];
      const { force, exclude } = req.query;
      const result = await importDashboards(client, objects, {
        overwrite: force,
        exclude: Array.isArray(exclude) ? exclude : [exclude],
      });
      return res.ok({
        body: result,
      });
    }
  );
};
