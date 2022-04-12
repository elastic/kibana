/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IRouter } from '../../http';
import { InternalCoreUsageDataSetup } from '../../core_usage_data';
import { catchAndReturnBoomErrors } from './utils';

interface RouteDependencies {
  coreUsageData: InternalCoreUsageDataSetup;
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
          aggs: schema.maybe(schema.string()),
          namespaces: schema.maybe(
            schema.oneOf([schema.string(), schema.arrayOf(schema.string())])
          ),
        }),
      },
    },
    catchAndReturnBoomErrors(async (context, req, res) => {
      const query = req.query;

      const namespaces =
        typeof req.query.namespaces === 'string' ? [req.query.namespaces] : req.query.namespaces;

      const usageStatsClient = coreUsageData.getClient();
      usageStatsClient.incrementSavedObjectsFind({ request: req }).catch(() => {});

      // manually validation to avoid using JSON.parse twice
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
      const result = await savedObjects.client.find({
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
        aggs,
        namespaces,
      });

      return res.ok({ body: result });
    })
  );
};
