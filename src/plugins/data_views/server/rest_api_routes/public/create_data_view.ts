/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { DataViewSpec } from '../../../common/types';
import { DataViewsService } from '../../../common/data_views';
import { handleErrors } from './util/handle_errors';
import { dataViewSpecSchema } from '../schema';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  DATA_VIEW_PATH,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  INITIAL_REST_VERSION,
} from '../../constants';
import { DataViewSpecRestResponse } from '../route_types';

interface CreateDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  spec: DataViewSpec;
  override?: boolean;
  refreshFields?: boolean;
  counterName: string;
}

export const createDataView = async ({
  dataViewsService,
  usageCollection,
  spec,
  override,
  counterName,
}: CreateDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.createAndSaveDataViewLazy(spec, override);
};

const registerCreateDataViewRouteFactory =
  (path: string, serviceKey: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.post({ path, access: 'public' }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
            body: schema.object({
              override: schema.maybe(schema.boolean({ defaultValue: false })),
              refresh_fields: schema.maybe(schema.boolean({ defaultValue: false })),
              data_view: serviceKey === SERVICE_KEY ? dataViewSpecSchema : schema.never(),
              index_pattern:
                serviceKey === SERVICE_KEY_LEGACY ? dataViewSpecSchema : schema.never(),
            }),
          },
          response: {
            200: {
              body: schema.object({
                [serviceKey]: dataViewSpecSchema,
              }),
            },
          },
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const core = await ctx.core;
          const savedObjectsClient = core.savedObjects.client;
          const elasticsearchClient = core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();

          const dataViewsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const body = req.body;

          const spec = serviceKey === SERVICE_KEY ? body.data_view : body.index_pattern;

          const dataView = await createDataView({
            dataViewsService,
            usageCollection,
            spec: { ...spec, name: spec.name || spec.title } as DataViewSpec,
            override: body.override,
            refreshFields: body.refresh_fields,
            counterName: `${req.route.method} ${path}`,
          });

          const toSpecParams =
            body.refresh_fields === false ? {} : { fieldParams: { fieldName: ['*'] } };

          const responseBody: Record<string, DataViewSpecRestResponse> = {
            [serviceKey]: {
              ...(await dataView.toSpec(toSpecParams)),
              namespaces: dataView.namespaces,
            },
          };

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: responseBody,
          });
        })
      )
    );
  };

export const registerCreateDataViewRoute = registerCreateDataViewRouteFactory(
  DATA_VIEW_PATH,
  SERVICE_KEY
);

export const registerCreateDataViewRouteLegacy = registerCreateDataViewRouteFactory(
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
