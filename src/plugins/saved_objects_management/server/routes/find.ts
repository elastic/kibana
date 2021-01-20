/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from 'src/core/server';
import { injectMetaAttributes } from '../lib';
import { ISavedObjectsManagement } from '../services';

export const registerFindRoute = (
  router: IRouter,
  managementServicePromise: Promise<ISavedObjectsManagement>
) => {
  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });
  const searchOperatorSchema = schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  });

  router.get(
    {
      path: '/api/kibana/management/saved_objects/_find',
      validate: {
        query: schema.object({
          perPage: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          defaultSearchOperator: searchOperatorSchema,
          sortField: schema.maybe(schema.string()),
          hasReference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
          ),
          hasReferenceOperator: searchOperatorSchema,
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
