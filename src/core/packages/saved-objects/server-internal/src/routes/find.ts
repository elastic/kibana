/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { schema } from '@kbn/config-schema';
import type { RouteAccess, RouteDeprecationInfo } from '@kbn/core-http-server';
import type { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { InternalSavedObjectRouter } from '../internal_types';
import { catchAndReturnBoomErrors, throwOnHttpHiddenTypes } from './utils';
import { logWarnOnExternalRequest } from './utils';

interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
  access: RouteAccess;
  deprecationInfo: RouteDeprecationInfo;
}

export const registerFindRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger, access, deprecationInfo }: RouteDependencies
) => {
  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });
  const searchOperatorSchema = schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  });
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/_find',
      options: {
        summary: `Search for saved objects`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
        description: `Retrieve a paginated set of Kibana saved objects.

WARNING: This API is intended to be removed in a future Elastic Stack version.
Consider using the export API for your use case.`,
        oasOperationObject: () => path.resolve(__dirname, './find.examples.yaml'),
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the Saved Objects Client',
        },
      },
      validate: {
        query: schema.object({
          per_page: schema.number({
            min: 0,
            defaultValue: 20,
            meta: { description: 'The number of objects to return per page.' },
          }),
          page: schema.number({
            min: 0,
            defaultValue: 1,
            meta: { description: 'The page of objects to return.' },
          }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
            meta: {
              description: 'The saved object types to include in the response.',
            },
          }),
          search: schema.maybe(
            schema.string({
              meta: {
                description:
                  'An Elasticsearch simple_query_string query that filters the objects in the response.',
              },
            })
          ),
          default_search_operator: searchOperatorSchema,
          search_fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: {
                description: 'The fields to run the simple_query_string query against.',
              },
            })
          ),
          sort_field: schema.maybe(
            schema.string({
              meta: {
                description:
                  'The saved object field to sort by. When multiple types are requested, only root fields are supported.',
              },
            })
          ),
          has_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema, { maxSize: 100 })], {
              meta: {
                description:
                  'Filters to objects that have a relationship with the specified type and identifier combination.',
              },
            })
          ),
          has_reference_operator: searchOperatorSchema,
          has_no_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema, { maxSize: 100 })], {
              meta: {
                description:
                  'Filters to objects that do not have a relationship with the specified type and identifier combination.',
              },
            })
          ),
          has_no_reference_operator: searchOperatorSchema,
          fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: {
                description: 'The fields to include under the attributes key in each saved object.',
              },
            })
          ),
          filter: schema.maybe(
            schema.string({
              meta: {
                description:
                  'A KQL filter string. Refer to saved object attributes as savedObjectType.attributes.fieldName and root fields as savedObjectType.rootField.',
              },
            })
          ),
          aggs: schema.maybe(
            schema.string({
              meta: {
                description:
                  'An aggregation structure serialized as a string. Avoid using the find API to export large numbers of objects.',
              },
            })
          ),
          namespaces: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: {
                description: 'The space or spaces to search in for shareable saved object types.',
              },
            })
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, request, response) => {
      logWarnOnExternalRequest({
        method: 'get',
        path: '/api/saved_objects/_find',
        request,
        logger,
      });
      const query = request.query;
      const types: string[] = Array.isArray(query.type) ? query.type : [query.type];
      const namespaces =
        typeof request.query.namespaces === 'string'
          ? [request.query.namespaces]
          : request.query.namespaces;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsFind({ request, types }).catch(() => {});

      // manually validate to avoid using JSON.parse twice
      let aggs;
      if (query.aggs) {
        try {
          aggs = JSON.parse(query.aggs);
        } catch (e) {
          return response.badRequest({
            body: {
              message: 'invalid aggs value',
            },
          });
        }
      }
      const { savedObjects } = await context.core;

      // check if registered type(s)are exposed to the global SO Http API's.
      const unsupportedTypes = [...new Set(types)].filter((tname) => {
        const fullType = savedObjects.typeRegistry.getType(tname);
        // pass unknown types through to the registry to handle
        if (!fullType?.hidden && fullType?.hiddenFromHttpApis) {
          return fullType.name;
        }
      });
      if (unsupportedTypes.length > 0 && !allowHttpApiAccess) {
        throwOnHttpHiddenTypes(unsupportedTypes);
      }

      const result = await savedObjects.client.find({
        perPage: query.per_page,
        page: query.page,
        type: types,
        search: query.search,
        defaultSearchOperator: query.default_search_operator,
        searchFields:
          typeof query.search_fields === 'string' ? [query.search_fields] : query.search_fields,
        sortField: query.sort_field,
        hasReference: query.has_reference,
        hasReferenceOperator: query.has_reference_operator,
        hasNoReference: query.has_no_reference,
        hasNoReferenceOperator: query.has_no_reference_operator,
        fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
        filter: query.filter,
        aggs,
        namespaces,
        migrationVersionCompatibility: 'compatible',
      });

      return response.ok({ body: result });
    })
  );
};
