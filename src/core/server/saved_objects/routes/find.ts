/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { CoreUsageDataSetup } from '../../core_usage_data';

interface RouteDependencies {
  coreUsageData: CoreUsageDataSetup;
}

export const registerFindRoute = (router: IRouter, { coreUsageData }: RouteDependencies) => {
  const referenceSchema = schema.object({
    type: schema.string(),
    id: schema.string(),
  });
  const searchOperatorSchema = schema.oneOf([schema.literal('OR'), schema.literal('AND')], {
    defaultValue: 'OR',
  });

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
          fields: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
          filter: schema.maybe(schema.string()),
          namespaces: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
        }),
      },
    },
    router.handleLegacyErrors(async (context, req, res) => {
      const query = req.query;

      const namespaces =
        typeof req.query.namespaces === 'string' ? [req.query.namespaces] : req.query.namespaces;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsFind({ request: req }).catch(() => {});

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
        hasReferenceOperator: query.has_reference_operator,
        fields: typeof query.fields === 'string' ? [query.fields] : query.fields,
        filter: query.filter,
        namespaces,
      });

      return res.ok({ body: result });
    })
  );
};
