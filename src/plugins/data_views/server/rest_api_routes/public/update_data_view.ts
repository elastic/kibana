/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { IRouter, StartServicesAccessor } from '@kbn/core/server';
import { DataViewSpecRestResponse } from '../route_types';
import { DataViewsService } from '../../../common/data_views';
import { DataViewSpec } from '../../../common/types';
import { handleErrors } from './util/handle_errors';
import { fieldSpecSchema, runtimeFieldSchema, serializedFieldFormatSchema } from '../../schemas';
import { dataViewSpecSchema } from '../schema';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  INITIAL_REST_VERSION,
  UPDATE_DATA_VIEW_DESCRIPTION,
} from '../../constants';

const indexPatternUpdateSchema = schema.object({
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
        clientId: schema.maybe(schema.oneOf([schema.string(), schema.number()])),
      })
    )
  ),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
  allowNoIndex: schema.maybe(schema.boolean()),
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSchema)),
  name: schema.maybe(schema.string()),
});

interface UpdateDataViewArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  spec: DataViewSpec;
  id: string;
  refreshFields: boolean;
  counterName: string;
}

export const updateDataView = async ({
  dataViewsService,
  usageCollection,
  spec,
  id,
  refreshFields,
  counterName,
}: UpdateDataViewArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.getDataViewLazy(id);
  const {
    title,
    timeFieldName,
    sourceFilters,
    fieldFormats,
    type,
    typeMeta,
    fields,
    runtimeFieldMap,
    name,
  } = spec;

  let isChanged = false;

  if (title !== undefined && title !== dataView.title) {
    isChanged = true;
    dataView.title = title;
  }

  if (timeFieldName !== undefined && timeFieldName !== dataView.timeFieldName) {
    isChanged = true;
    dataView.timeFieldName = timeFieldName;
  }

  if (sourceFilters !== undefined) {
    isChanged = true;
    dataView.sourceFilters = sourceFilters;
  }

  if (fieldFormats !== undefined) {
    isChanged = true;
    dataView.fieldFormatMap = fieldFormats;
  }

  if (type !== undefined) {
    isChanged = true;
    dataView.type = type;
  }

  if (typeMeta !== undefined) {
    isChanged = true;
    dataView.typeMeta = typeMeta;
  }

  if (name !== undefined) {
    isChanged = true;
    dataView.name = name;
  }

  if (fields !== undefined) {
    isChanged = true;
    dataView.replaceAllScriptedFields(fields);
  }

  if (runtimeFieldMap !== undefined) {
    isChanged = true;
    dataView.replaceAllRuntimeFields(runtimeFieldMap);
  }

  if (isChanged) {
    await dataViewsService.updateSavedObject(dataView);
  }

  return dataView;
};

const updateDataViewRouteFactory =
  (path: string, serviceKey: string, description?: string) =>
  (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned.post({ path, access: 'public', description }).addVersion(
      {
        version: INITIAL_REST_VERSION,
        validate: {
          request: {
            params: schema.object(
              {
                id: schema.string({
                  minLength: 1,
                  maxLength: 1_000,
                }),
              },
              { unknowns: 'allow' }
            ),
            body: schema.object({
              refresh_fields: schema.maybe(schema.boolean({ defaultValue: false })),
              [serviceKey]: indexPatternUpdateSchema,
            }),
          },
          response: {
            200: {
              body: () =>
                schema.object({
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
          const id = req.params.id;

          const {
            // eslint-disable-next-line @typescript-eslint/naming-convention
            refresh_fields = true,
          } = req.body;

          const spec = req.body[serviceKey] as DataViewSpec;

          const dataView = await updateDataView({
            dataViewsService,
            usageCollection,
            id,
            refreshFields: refresh_fields as boolean,
            spec,
            counterName: `${req.route.method} ${path}`,
          });

          const body: Record<string, DataViewSpecRestResponse> = {
            [serviceKey]: await dataView.toSpec({ fieldParams: { fieldName: ['*'] } }),
          };

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body,
          });
        })
      )
    );
  };

export const registerUpdateDataViewRoute = updateDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH,
  SERVICE_KEY,
  UPDATE_DATA_VIEW_DESCRIPTION
);

export const registerUpdateDataViewRouteLegacy = updateDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
