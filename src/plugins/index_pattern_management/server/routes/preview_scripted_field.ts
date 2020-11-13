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
import { IRouter } from 'src/core/server';

export function registerPreviewScriptedFieldRoute(router: IRouter): void {
  router.post(
    {
      path: '/internal/index-pattern-management/preview_scripted_field',
      validate: {
        body: schema.object({
          index: schema.string(),
          name: schema.string(),
          script: schema.string(),
          query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
          additionalFields: schema.maybe(schema.arrayOf(schema.string())),
        }),
      },
    },
    async (context, request, res) => {
      const client = context.core.elasticsearch.client.asCurrentUser;
      const { index, name, script, query, additionalFields } = request.body;

      try {
        const response = await client.search({
          index,
          _source: additionalFields && additionalFields.length > 0 ? additionalFields : undefined,
          size: 10,
          timeout: '30s',
          body: {
            query: query ?? { match_all: {} },
            script_fields: {
              [name]: {
                script: {
                  lang: 'painless',
                  source: script,
                },
              },
            },
          },
        });

        return res.ok({ body: response });
      } catch (err) {
        return res.customError({
          statusCode: err.statusCode || 500,
          body: {
            message: err.message,
            attributes: {
              error: err.body?.error || err.message,
            },
          },
        });
      }
    }
  );
}
