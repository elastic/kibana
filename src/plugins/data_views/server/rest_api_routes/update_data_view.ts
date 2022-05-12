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
import { DataViewSpec, DataViewsService } from '../../common';
import { handleErrors } from './util/handle_errors';
import { fieldSpecSchema, runtimeFieldSchema, serializedFieldFormatSchema } from './util/schemas';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from '../constants';

const indexPatternUpdateSchema = schema.object({
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  timeFieldName: schema.maybe(schema.string()),
  sourceFilters: schema.maybe(
    schema.arrayOf(
      schema.object({
        value: schema.string(),
      })
    )
  ),
  fieldFormats: schema.maybe(schema.recordOf(schema.string(), serializedFieldFormatSchema)),
  fields: schema.maybe(schema.recordOf(schema.string(), fieldSpecSchema)),
  allowNoIndex: schema.maybe(schema.boolean()),
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSchema)),
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
  const dataView = await dataViewsService.get(id);
  const {
    title,
    timeFieldName,
    sourceFilters,
    fieldFormats,
    type,
    typeMeta,
    fields,
    runtimeFieldMap,
  } = spec;

  let changeCount = 0;
  let doRefreshFields = false;

  if (title !== undefined && title !== dataView.title) {
    changeCount++;
    dataView.title = title;
  }

  if (timeFieldName !== undefined && timeFieldName !== dataView.timeFieldName) {
    changeCount++;
    dataView.timeFieldName = timeFieldName;
  }

  if (sourceFilters !== undefined) {
    changeCount++;
    dataView.sourceFilters = sourceFilters;
  }

  if (fieldFormats !== undefined) {
    changeCount++;
    dataView.fieldFormatMap = fieldFormats;
  }

  if (type !== undefined) {
    changeCount++;
    dataView.type = type;
  }

  if (typeMeta !== undefined) {
    changeCount++;
    dataView.typeMeta = typeMeta;
  }

  if (fields !== undefined) {
    changeCount++;
    doRefreshFields = true;
    dataView.fields.replaceAll(
      Object.values(fields || {}).map((field) => ({
        ...field,
        aggregatable: true,
        searchable: true,
      }))
    );
  }

  if (runtimeFieldMap !== undefined) {
    changeCount++;
    dataView.replaceAllRuntimeFields(runtimeFieldMap);
  }

  if (changeCount < 1) {
    throw new Error('Index pattern change set is empty.');
  }

  await dataViewsService.updateSavedObject(dataView);

  if (doRefreshFields && refreshFields) {
    await dataViewsService.refreshFields(dataView);
  }
  return dataView;
};

const updateDataViewRouteFactory =
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

export const registerUpdateDataViewRoute = updateDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH,
  SERVICE_KEY
);

export const registerUpdateDataViewRouteLegacy = updateDataViewRouteFactory(
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY_LEGACY
);
