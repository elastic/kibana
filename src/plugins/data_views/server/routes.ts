/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpServiceSetup, StartServicesAccessor } from '@kbn/core/server';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IndexPatternsFetcher } from './fetcher';
import { routes } from './rest_api_routes';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';

import { registerFieldForWildcard } from './routes/fields_for';
import { registerHasDataViewsRoute } from './routes/has_data_views';

export function registerRoutes(
  http: HttpServiceSetup,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >,
  dataViewRestCounter?: UsageCounter
) {
  const parseMetaFields = (metaFields: string | string[]) => {
    let parsedFields: string[] = [];
    if (typeof metaFields === 'string') {
      parsedFields = JSON.parse(metaFields);
    } else {
      parsedFields = metaFields;
    }
    return parsedFields;
  };

  const router = http.createRouter();

  routes.forEach((route) => route(router, getStartServices, dataViewRestCounter));

  registerFieldForWildcard(router, getStartServices);
  registerHasDataViewsRoute(router);

  router.get(
    {
      path: '/api/index_patterns/_fields_for_time_pattern',
      validate: {
        query: schema.object({
          pattern: schema.string(),
          interval: schema.maybe(schema.string()),
          look_back: schema.number({ min: 1 }),
          meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
        }),
      },
    },
    async (context, request, response) => {
      const { asCurrentUser } = (await context.core).elasticsearch.client;
      const indexPatterns = new IndexPatternsFetcher(asCurrentUser);
      const { pattern, interval, look_back: lookBack, meta_fields: metaFields } = request.query;

      let parsedFields: string[] = [];
      try {
        parsedFields = parseMetaFields(metaFields);
      } catch (error) {
        return response.badRequest();
      }

      try {
        const fields = await indexPatterns.getFieldsForTimePattern({
          pattern,
          interval: interval ? interval : '',
          lookBack,
          metaFields: parsedFields,
        });

        return response.ok({
          body: { fields },
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        return response.notFound();
      }
    }
  );
}
