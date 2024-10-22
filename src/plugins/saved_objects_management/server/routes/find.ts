/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Type, schema } from '@kbn/config-schema';
import type {
  IRouter,
  ISavedObjectTypeRegistry,
  SavedObjectsClientContract,
} from '@kbn/core/server';

import type { v1 } from '../../common';
import { injectMetaAttributes, toSavedObjectWithMeta } from '../lib';
import type { ISavedObjectsManagement } from '../services';

/**
 * Some saved object don't have a title field to search against (e.g. the "config" type for advanced settings).
 * Yet we sill want to be able to search for `"advanced"` in the UI and have the advanced settings doc be returned.
 * This function searches against the runtime titles of saved objects which have a `management.getTitle()` method.
 */
async function searchRuntimeTitle({
  search: _search,
  dbSearchResult,
  typeRegistry,
  client,
}: {
  search?: string;
  typeRegistry: ISavedObjectTypeRegistry;
  client: SavedObjectsClientContract;
  dbSearchResult: v1.SavedObjectWithMetadata[];
}): Promise<v1.SavedObjectWithMetadata[]> {
  if (!_search) return [];

  const search = _search.replace(/\*/g, '').trim();

  const typesWithRuntimeTitle = typeRegistry
    .getAllTypes()
    .filter((type) => type.management?.searchRuntimeTitle)
    .map((type) => type.name);

  const findResponse = await client.find<any>({
    type: typesWithRuntimeTitle,
    fields: undefined,
  });

  const dbSearchResultById = dbSearchResult.reduce((acc, so) => {
    acc[so.id] = so;
    return acc;
  }, {} as Record<string, v1.SavedObjectWithMetadata>);

  const searchMatch = findResponse.saved_objects.filter((so) => {
    const type = typeRegistry.getType(so.type);
    const title = type?.management?.getTitle?.(so);
    if (!title) return false;

    const titleMatches = title.toLowerCase().includes(search.toLowerCase());

    return titleMatches
      ? dbSearchResultById[so.id] === undefined // only return if not already in the db search result
      : false;
  });

  return searchMatch.map(toSavedObjectWithMeta);
}

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
      security: {
        authz: {
          enabled: false,
          reason: 'This route is opted out from authorization',
        },
      },
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
      const savedObjectsWithRuntimeTitle = await searchRuntimeTitle({
        search: query.search,
        dbSearchResult: savedObjects,
        typeRegistry,
        client,
      });

      const response: v1.FindResponseHTTP = {
        saved_objects: [...savedObjects, ...savedObjectsWithRuntimeTitle].map((so) => {
          const obj = injectMetaAttributes(so, managementService);
          const result = { ...obj, attributes: {} as Record<string, unknown> };
          return result;
        }),
        total: findResponse.total + savedObjectsWithRuntimeTitle.length,
        per_page: findResponse.per_page,
        page: findResponse.page,
      };

      return res.ok({ body: response });
    })
  );
};
