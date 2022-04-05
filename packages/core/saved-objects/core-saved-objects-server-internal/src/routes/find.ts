/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectConfig } from '@kbn/core-saved-objects-base-server-internal';
import type { InternalCoreUsageDataSetup } from '@kbn/core-usage-data-base-server-internal';
import type { Logger } from '@kbn/logging';
import type { InternalSavedObjectRouter } from '../internal_types';
import { catchAndReturnBoomErrors, throwOnHttpHiddenTypes } from './utils';
import { logWarnOnExternalRequest } from './utils';
interface RouteDependencies {
  config: SavedObjectConfig;
  coreUsageData: InternalCoreUsageDataSetup;
  logger: Logger;
}

export const registerFindRoute = (
  router: InternalSavedObjectRouter,
  { config, coreUsageData, logger }: RouteDependencies
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
      validate: {
        query: schema.object({
          per_page: schema.number({ min: 0, defaultValue: 20 }),
          page: schema.number({ min: 0, defaultValue: 1 }),
          type: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
          search: schema.maybe(schema.string()),
          default_search_operator: searchOperatorSchema,
          search_fields: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
          sort_field: schema.maybe(schema.string()),
          has_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
          ),
          has_reference_operator: searchOperatorSchema,
          has_no_reference: schema.maybe(
            schema.oneOf([referenceSchema, schema.arrayOf(referenceSchema)])
          ),
          has_no_reference_operator: searchOperatorSchema,
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filter: schema.maybe(schema.string()),
          aggs: schema.maybe(schema.string()),
          namespaces: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      logWarnOnExternalRequest({
        method: 'get',
        path: '/api/saved_objects/_find',
        req,
        logger,
      });
      const query = req.query;

      const namespaces =
        typeof req.query.namespaces === 'string' ? [req.query.namespaces] : req.query.namespaces;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsFind({ request: req }).catch(() => {});

      // manually validate to avoid using JSON.parse twice
      let aggs;
      if (query.aggs) {
        try {
          aggs = JSON.parse(query.aggs);
        } catch (e) {
          return res.badRequest({
            body: {
              message: 'invalid aggs value',
            },
          });
        }
      }
      const { savedObjects } = await context.core;

      // check if registered type(s)are exposed to the global SO Http API's.
      const findForTypes = Array.isArray(query.type) ? query.type : [query.type];

      const unsupportedTypes = [...new Set(findForTypes)].filter((tname) => {
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
        type: findForTypes,
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

      return res.ok({ body: result });
    })
  );
};
