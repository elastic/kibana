/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpServiceSetup, RequestHandlerContext, StartServicesAccessor } from 'kibana/server';
import { IndexPatternsFetcher } from './fetcher';
import {
  registerCreateDataViewRoute,
  registerCreateDataViewRouteLegacy,
} from './routes/create_index_pattern';
import {
  registerGetDataViewRoute,
  registerGetDataViewRouteLegacy,
} from './routes/get_index_pattern';
import {
  registerDeleteDataViewRoute,
  registerDeleteDataViewRouteLegacy,
} from './routes/delete_index_pattern';
import {
  registerUpdateDataViewRoute,
  registerUpdateDataViewRouteLegacy,
} from './routes/update_index_pattern';
import {
  registerUpdateFieldsRoute,
  registerUpdateFieldsRouteLegacy,
} from './routes/fields/update_fields';
import {
  registerCreateScriptedFieldRoute,
  registerCreateScriptedFieldRouteLegacy,
} from './routes/scripted_fields/create_scripted_field';
import {
  registerPutScriptedFieldRoute,
  registerPutScriptedFieldRouteLegacy,
} from './routes/scripted_fields/put_scripted_field';
import {
  registerGetScriptedFieldRoute,
  registerGetScriptedFieldRouteLegacy,
} from './routes/scripted_fields/get_scripted_field';
import {
  registerDeleteScriptedFieldRoute,
  registerDeleteScriptedFieldRouteLegacy,
} from './routes/scripted_fields/delete_scripted_field';
import {
  registerUpdateScriptedFieldRoute,
  registerUpdateScriptedFieldRouteLegacy,
} from './routes/scripted_fields/update_scripted_field';
import type { DataPluginStart, DataPluginStartDependencies } from '../plugin';
import {
  registerManageDefaultDataViewRoute,
  registerManageDefaultDataViewRouteLegacy,
} from './routes/default_index_pattern';
import { registerCreateRuntimeFieldRoute } from './routes/runtime_fields/create_runtime_field';
import { registerGetRuntimeFieldRoute } from './routes/runtime_fields/get_runtime_field';
import { registerDeleteRuntimeFieldRoute } from './routes/runtime_fields/delete_runtime_field';
import { registerPutRuntimeFieldRoute } from './routes/runtime_fields/put_runtime_field';
import { registerUpdateRuntimeFieldRoute } from './routes/runtime_fields/update_runtime_field';
import {
  registerHasUserDataViewRoute,
  registerHasUserDataViewRouteLegacy,
} from './routes/has_user_index_pattern';

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

  // Data Views API
  registerCreateDataViewRoute(router, getStartServices);
  registerGetDataViewRoute(router, getStartServices);
  registerDeleteDataViewRoute(router, getStartServices);
  registerUpdateDataViewRoute(router, getStartServices);
  registerManageDefaultDataViewRoute(router, getStartServices);
  registerHasUserDataViewRoute(router, getStartServices);

  // Fields API
  registerUpdateFieldsRoute(router, getStartServices);

  // Scripted Field API
  registerCreateScriptedFieldRoute(router, getStartServices);
  registerPutScriptedFieldRoute(router, getStartServices);
  registerGetScriptedFieldRoute(router, getStartServices);
  registerDeleteScriptedFieldRoute(router, getStartServices);
  registerUpdateScriptedFieldRoute(router, getStartServices);

  // Runtime Fields API
  registerCreateRuntimeFieldRoute(router, getStartServices);
  registerGetRuntimeFieldRoute(router, getStartServices);
  registerDeleteRuntimeFieldRoute(router, getStartServices);
  registerPutRuntimeFieldRoute(router, getStartServices);
  registerUpdateRuntimeFieldRoute(router, getStartServices);

  // Legacy Index Pattern API
  registerCreateDataViewRouteLegacy(router, getStartServices);
  registerGetDataViewRouteLegacy(router, getStartServices);
  registerDeleteDataViewRouteLegacy(router, getStartServices);
  registerUpdateDataViewRouteLegacy(router, getStartServices);
  registerManageDefaultDataViewRouteLegacy(router, getStartServices);
  registerHasUserDataViewRouteLegacy(router, getStartServices);

  // Fields API
  registerUpdateFieldsRouteLegacy(router, getStartServices);

  // Scripted Field API
  registerCreateScriptedFieldRouteLegacy(router, getStartServices);
  registerPutScriptedFieldRouteLegacy(router, getStartServices);
  registerGetScriptedFieldRouteLegacy(router, getStartServices);
  registerDeleteScriptedFieldRouteLegacy(router, getStartServices);
  registerUpdateScriptedFieldRouteLegacy(router, getStartServices);

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
