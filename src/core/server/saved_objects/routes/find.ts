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

export const registerFindRoute = (router: IRouter) => {
  router.get(
    {
      path: '/_find',
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          default_search_operator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
            defaultValue: 'OR',
          }),
          search_fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
          sort_field: schema.maybe(schema.string()),
          has_reference: schema.maybe(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            })
          ),
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filter: schema.maybe(schema.string()),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const query = req.query;
      const result = await context.core.savedObjects.client.find({
        perPage: query.per_page,
        page: query.page,
        type: Array.isArray(query.type) ? query.type : [query.type],
        search: query.search,
        defaultSearchOperator: query.default_search_operator,
        searchFields:
          typeof query.search_fields === 'string' ? [query.search_fields] : query.search_fields,
        sortField: query.sort_field,
        hasReference: query.has_reference,
        fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
        filter: query.filter,
      });

      return res.ok({ body: result });
    })
  );
};
