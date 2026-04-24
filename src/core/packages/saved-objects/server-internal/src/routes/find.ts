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
    meta: {
      description: 'The boolean operator to use when combining multiple values.',
    },
  });
  const { allowHttpApiAccess } = config;
  router.get(
    {
      path: '/_find',
      options: {
        summary: `Search for saved objects`,
        description: `WARNING: This API is deprecated. This is a legacy Saved Objects API and may be removed in a future version of Kibana.

Searches for Kibana saved objects.

For transferring or backing up saved objects, prefer the export API (\`POST /api/saved_objects/_export\`).`,
        tags: ['oas-tag:saved objects'],
        access,
        deprecated: deprecationInfo,
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
            meta: { description: 'The number of items per page.' },
          }),
          page: schema.number({
            min: 0,
            defaultValue: 1,
            meta: { description: 'The page index to return.' },
          }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
            meta: {
              description:
                'The saved object type or types to search for. Use multiple `type` values to search across types.',
            },
          }),
          search: schema.maybe(schema.string({ meta: { description: 'A text search string.' } })),
          default_search_operator: searchOperatorSchema,
          search_fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: { description: 'The fields to search on.' },
            })
          ),
          sort_field: schema.maybe(
            schema.string({ meta: { description: 'The field to sort on.' } })
          ),
          has_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema, { maxSize: 100 })], {
              meta: {
                description:
                  'Return only saved objects that have a reference to the specified saved object(s).',
              },
            })
          ),
          has_reference_operator: searchOperatorSchema,
          has_no_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema, { maxSize: 100 })], {
              meta: {
                description:
                  'Return only saved objects that do not have a reference to the specified saved object(s).',
              },
            })
          ),
          has_no_reference_operator: searchOperatorSchema,
          fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: { description: 'The fields to return for each saved object.' },
            })
          ),
          filter: schema.maybe(
            schema.string({ meta: { description: 'A KQL filter to apply to the search.' } })
          ),
          aggs: schema.maybe(
            schema.string({ meta: { description: 'Aggregations as a JSON string.' } })
          ),
          namespaces: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string(), { maxSize: 100 })], {
              meta: { description: 'The namespaces (spaces) to search in.' },
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
