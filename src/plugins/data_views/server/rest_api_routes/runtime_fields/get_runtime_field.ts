/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { DataViewsService } from 'src/plugins/data_views/common';
import { schema } from '@kbn/config-schema';
import { ErrorIndexPatternFieldNotFound } from '../../error';
import { handleErrors } from '../util/handle_errors';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import type {
  DataViewsServerPluginStart,
  DataViewsServerPluginStartDependencies,
} from '../../types';
import {
  SPECIFIC_RUNTIME_FIELD_PATH,
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  SERVICE_KEY_TYPE,
} from '../../constants';

interface GetRuntimeFieldArgs {
  indexPatternsService: DataViewsService;
  usageCollection?: UsageCounter;
  path: string;
  id: string;
  name: string;
}

const getRuntimeField = async ({
  indexPatternsService,
  usageCollection,
  path,
  id,
  name,
}: GetRuntimeFieldArgs) => {
  usageCollection?.incrementCounter({ counterName: `GET ${path}` });
  const indexPattern = await indexPatternsService.get(id);

  const field = indexPattern.fields.getByName(name);

  if (!field) {
    throw new ErrorIndexPatternFieldNotFound(id, name);
  }

  if (!field.runtimeField) {
    throw new Error('Only runtime fields can be retrieved.');
  }

  return { indexPattern, field };
};

const getRuntimeFieldRouteFactory =
  (path: string, serviceKey: SERVICE_KEY_TYPE) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.get(
      {
        path,
        validate: {
          params: schema.object({
            id: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
            name: schema.string({
              minLength: 1,
              maxLength: 1_000,
            }),
          }),
        },
      },

      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient,
          req
        );
        const id = req.params.id;
        const name = req.params.name;

        const { indexPattern, field } = await getRuntimeField({
          indexPatternsService,
          usageCollection,
          path,
          id,
          name,
        });

        const legacyResponse = {
          body: {
            field: field.toSpec(),
            runtimeField: indexPattern.getRuntimeField(name),
          },
        };

        const response = {
          body: {
            fields: [field.toSpec()],
            runtimeField: indexPattern.getRuntimeField(name),
          },
        };

        return res.ok(serviceKey === SERVICE_KEY_LEGACY ? legacyResponse : response);
      })
    );
  };

export const registerGetRuntimeFieldRoute = getRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH,
  SERVICE_KEY
);

export const registerGetRuntimeFieldRouteLegacy = getRuntimeFieldRouteFactory(
  SPECIFIC_RUNTIME_FIELD_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
