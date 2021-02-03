/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpServiceSetup, RequestHandlerContext, StartServicesAccessor } from 'kibana/server';
import { IndexPatternsFetcher } from './fetcher';
import { registerCreateIndexPatternRoute } from './routes/create_index_pattern';
import { registerGetIndexPatternRoute } from './routes/get_index_pattern';
import { registerDeleteIndexPatternRoute } from './routes/delete_index_pattern';
import { registerUpdateIndexPatternRoute } from './routes/update_index_pattern';
import { registerUpdateFieldsRoute } from './routes/fields/update_fields';
import { registerCreateScriptedFieldRoute } from './routes/scripted_fields/create_scripted_field';
import { registerPutScriptedFieldRoute } from './routes/scripted_fields/put_scripted_field';
import { registerGetScriptedFieldRoute } from './routes/scripted_fields/get_scripted_field';
import { registerDeleteScriptedFieldRoute } from './routes/scripted_fields/delete_scripted_field';
import { registerUpdateScriptedFieldRoute } from './routes/scripted_fields/update_scripted_field';
import type { DataPluginStart, DataPluginStartDependencies } from '../plugin';

export function registerRoutes(
  http: HttpServiceSetup,
  getStartServices: StartServicesAccessor<DataPluginStartDependencies, DataPluginStart>
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

  // Index Patterns API
  registerCreateIndexPatternRoute(router, getStartServices);
  registerGetIndexPatternRoute(router, getStartServices);
  registerDeleteIndexPatternRoute(router, getStartServices);
  registerUpdateIndexPatternRoute(router, getStartServices);

  // Fields API
  registerUpdateFieldsRoute(router, getStartServices);

  // Scripted Field API
  registerCreateScriptedFieldRoute(router, getStartServices);
  registerPutScriptedFieldRoute(router, getStartServices);
  registerGetScriptedFieldRoute(router, getStartServices);
  registerDeleteScriptedFieldRoute(router, getStartServices);
  registerUpdateScriptedFieldRoute(router, getStartServices);

  router.get(
    {
      path: '/api/index_patterns/_fields_for_wildcard',
      validate: {
        query: schema.object({
          pattern: schema.string(),
          meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
          type: schema.maybe(schema.string()),
          rollup_index: schema.maybe(schema.string()),
          allow_no_index: schema.maybe(schema.boolean()),
        }),
      },
    },
    async (context, request, response) => {
      const { asCurrentUser } = context.core.elasticsearch.client;
      const indexPatterns = new IndexPatternsFetcher(asCurrentUser);
      const {
        pattern,
        meta_fields: metaFields,
        type,
        rollup_index: rollupIndex,
        allow_no_index: allowNoIndex,
      } = request.query;

      let parsedFields: string[] = [];
      try {
        parsedFields = parseMetaFields(metaFields);
      } catch (error) {
        return response.badRequest();
      }

      try {
        const fields = await indexPatterns.getFieldsForWildcard({
          pattern,
          metaFields: parsedFields,
          type,
          rollupIndex,
          fieldCapsOptions: {
            allow_no_indices: allowNoIndex || false,
          },
        });

        return response.ok({
          body: { fields },
          headers: {
            'content-type': 'application/json',
          },
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          !!error?.isBoom &&
          !!error?.output?.payload &&
          typeof error?.output?.payload === 'object'
        ) {
          const payload = error?.output?.payload;
          return response.notFound({
            body: {
              message: payload.message,
              attributes: payload,
            },
          });
        } else {
          return response.notFound();
        }
      }
    }
  );

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
    async (context: RequestHandlerContext, request: any, response: any) => {
      const { asCurrentUser } = context.core.elasticsearch.client;
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
