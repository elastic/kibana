/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Type, schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';

import type { v1 } from '../../common';
import { injectMetaAttributes, toSavedObjectWithMeta } from '../lib';
import type { ISavedObjectsManagement } from '../services';

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
  const sortFieldSchema: Type<keyof v1.SavedObjectWithMetadata> = schema.oneOf([
    schema.literal('created_at'),
    schema.literal('updated_at'),
    schema.literal('type'),
  ]);

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
          sortField: schema.maybe(sortFieldSchema),
          sortOrder: schema.maybe(schema.oneOf([schema.literal('asc'), schema.literal('desc')])),
          hasReference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
          ),
          hasReferenceOperator: searchOperatorSchema,
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const { query } = req;
      const managementService = await managementServicePromise;
      const { getClient, typeRegistry } = (await context.core).savedObjects;

      const searchTypes = Array.isArray(query.type) ? query.type : [query.type];

      const importAndExportableTypes = searchTypes.filter((type) =>
        typeRegistry.isImportableAndExportable(type)
      );

      const includedHiddenTypes = importAndExportableTypes.filter((type) =>
        typeRegistry.isHidden(type)
      );

      const client = getClient({ includedHiddenTypes });
      const searchFields = new Set<string>();

      importAndExportableTypes.forEach((type) => {
        const searchField = managementService.getDefaultSearchField(type);
        if (searchField) {
          searchFields.add(searchField);
        }
      });

      const findResponse = await client.find<any>({
        ...query,
        fields: undefined,
        searchFields: [...searchFields],
      });

      const savedObjects = findResponse.saved_objects.map(toSavedObjectWithMeta);

      const response: v1.FindResponseHTTP = {
        saved_objects: savedObjects.map((so) => {
          const obj = injectMetaAttributes(so, managementService);
          const result = { ...obj, attributes: {} as Record<string, unknown> };
          return result;
        }),
        total: findResponse.total,
        per_page: findResponse.per_page,
        page: findResponse.page,
      };

      return res.ok({ body: response });
    })
  );
};
