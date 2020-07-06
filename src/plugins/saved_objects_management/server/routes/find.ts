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
import { injectMetaAttributes } from '../lib';
import { ISavedObjectsManagement } from '../services';

export const registerFindRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  router.get(
    {
      path: '/api/kibana/management/saved_objects/_find',
      validate: {
        query: schema.object({
          perPage: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          defaultSearchOperator: schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
            defaultValue: 'OR',
          }),
          sortField: schema.maybe(schema.string()),
          hasReference: schema.maybe(
            schema.object({
              type: schema.string(),
              id: schema.string(),
            })
          ),
          fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const managementService = await managementServicePromise;
      const { client } = context.core.savedObjects;
      const searchTypes = Array.isArray(req.query.type) ? req.query.type : [req.query.type];
      const includedFields = Array.isArray(req.query.fields)
        ? req.query.fields
        : [req.query.fields];
      const importAndExportableTypes = searchTypes.filter((type) =>
        managementService.isImportAndExportable(type)
      );

      const searchFields = new Set<string>();
      importAndExportableTypes.forEach((type) => {
        const searchField = managementService.getDefaultSearchField(type);
        if (searchField) {
          searchFields.add(searchField);
        }
      });

      const findResponse = await client.find<any>({
        ...req.query,
        fields: undefined,
        searchFields: [...searchFields],
      });

      const enhancedSavedObjects = findResponse.saved_objects
        .map((so) => injectMetaAttributes(so, managementService))
        .map((obj) => {
          const result = { ...obj, attributes: {} as Record<string, any> };
          for (const field of includedFields) {
            result.attributes[field] = obj.attributes[field];
          }
          return result;
        });

      return res.ok({
        body: {
          ...findResponse,
          saved_objects: enhancedSavedObjects,
        },
      });
    })
  );
};
