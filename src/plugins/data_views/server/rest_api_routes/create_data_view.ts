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
import { DataViewSpec, DataViewsService } from '../../common';
import { handleErrors } from './util/handle_errors';
import { fieldSpecSchema, runtimeFieldSchema, serializedFieldFormatSchema } from './util/schemas';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import {
  DATA_VIEW_PATH,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from '../constants';

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
  refreshFields,
  counterName,
}: CreateDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  return dataViewsService.createAndSave(spec, override, !refreshFields);
};

const dataViewSpecSchema = schema.object({
  title: schema.string(),
  version: schema.maybe(schema.string()),
  id: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
      })
    )
  ),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fieldAttrs: schema.maybe(
    schema.recordOf(
      schema.string(),
      schema.object({
        customLabel: schema.maybe(schema.string()),
        count: schema.maybe(schema.number()),
      })
    )
  ),
  allowNoIndex: schema.maybe(schema.boolean()),
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSchema)),
});

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
    router.post(
      {
        path,
        validate: {
          body: schema.object({
            override: schema.maybe(schema.boolean({ defaultValue: false })),
            refresh_fields: schema.maybe(schema.boolean({ defaultValue: false })),
            data_view: serviceKey === SERVICE_KEY ? dataViewSpecSchema : schema.never(),
            index_pattern: serviceKey === SERVICE_KEY_LEGACY ? dataViewSpecSchema : schema.never(),
          }),
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const savedObjectsClient = ctx.core.savedObjects.client;
          const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
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
            spec: spec as DataViewSpec,
            override: body.override,
            refreshFields: body.refresh_fields,
            counterName: `${req.route.method} ${path}`,
          });

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: {
              [serviceKey]: dataView.toSpec(),
            },
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
