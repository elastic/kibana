/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { HttpServiceSetup, StartServicesAccessor } from 'kibana/server';
import { UsageCounter } from 'src/plugins/usage_collection/server';
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
import { registerCreateScriptedFieldRoute } from './routes/scripted_fields/create_scripted_field';
import { registerPutScriptedFieldRoute } from './routes/scripted_fields/put_scripted_field';
import { registerGetScriptedFieldRoute } from './routes/scripted_fields/get_scripted_field';
import { registerDeleteScriptedFieldRoute } from './routes/scripted_fields/delete_scripted_field';
import { registerUpdateScriptedFieldRoute } from './routes/scripted_fields/update_scripted_field';
import {
  registerManageDefaultDataViewRoute,
  registerManageDefaultDataViewRouteLegacy,
} from './routes/default_index_pattern';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from './types';

import {
  registerCreateRuntimeFieldRoute,
  registerCreateRuntimeFieldRouteLegacy,
} from './routes/runtime_fields/create_runtime_field';
import {
  registerGetRuntimeFieldRoute,
  registerGetRuntimeFieldRouteLegacy,
} from './routes/runtime_fields/get_runtime_field';
import {
  registerDeleteRuntimeFieldRoute,
  registerDeleteRuntimeFieldRouteLegacy,
} from './routes/runtime_fields/delete_runtime_field';
import {
  registerPutRuntimeFieldRoute,
  registerPutRuntimeFieldRouteLegacy,
} from './routes/runtime_fields/put_runtime_field';
import {
  registerUpdateRuntimeFieldRoute,
  registerUpdateRuntimeFieldRouteLegacy,
} from './routes/runtime_fields/update_runtime_field';
import {
  registerHasUserDataViewRoute,
  registerHasUserDataViewRouteLegacy,
} from './routes/has_user_index_pattern';

import { registerFieldForWildcard } from './fields_for';

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

  // Data Views API
  registerCreateDataViewRoute(router, getStartServices, dataViewRestCounter);
  registerGetDataViewRoute(router, getStartServices, dataViewRestCounter);
  registerDeleteDataViewRoute(router, getStartServices, dataViewRestCounter);
  registerUpdateDataViewRoute(router, getStartServices, dataViewRestCounter);
  registerManageDefaultDataViewRoute(router, getStartServices, dataViewRestCounter);
  registerHasUserDataViewRoute(router, getStartServices, dataViewRestCounter);

  // Fields API
  registerUpdateFieldsRoute(router, getStartServices, dataViewRestCounter);

  // Runtime Fields API
  registerCreateRuntimeFieldRoute(router, getStartServices, dataViewRestCounter);
  registerGetRuntimeFieldRoute(router, getStartServices, dataViewRestCounter);
  registerDeleteRuntimeFieldRoute(router, getStartServices, dataViewRestCounter);
  registerPutRuntimeFieldRoute(router, getStartServices, dataViewRestCounter);
  registerUpdateRuntimeFieldRoute(router, getStartServices, dataViewRestCounter);

  // ###
  // Legacy Index Pattern API
  // ###
  registerCreateDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerGetDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerDeleteDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerUpdateDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerManageDefaultDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerHasUserDataViewRouteLegacy(router, getStartServices, dataViewRestCounter);

  // Fields API
  registerUpdateFieldsRouteLegacy(router, getStartServices, dataViewRestCounter);

  // Scripted Field API
  registerCreateScriptedFieldRoute(router, getStartServices, dataViewRestCounter);
  registerPutScriptedFieldRoute(router, getStartServices, dataViewRestCounter);
  registerGetScriptedFieldRoute(router, getStartServices, dataViewRestCounter);
  registerDeleteScriptedFieldRoute(router, getStartServices, dataViewRestCounter);
  registerUpdateScriptedFieldRoute(router, getStartServices, dataViewRestCounter);

  // Runtime Fields API
  registerCreateRuntimeFieldRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerGetRuntimeFieldRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerDeleteRuntimeFieldRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerPutRuntimeFieldRouteLegacy(router, getStartServices, dataViewRestCounter);
  registerUpdateRuntimeFieldRouteLegacy(router, getStartServices, dataViewRestCounter);
  // ###

  registerFieldForWildcard(router, getStartServices);

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
