/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UsageCounter } from 'src/plugins/usage_collection/server';
import { schema } from '@kbn/config-schema';
import { DataViewSpec } from 'src/plugins/data_views/common';
import { handleErrors } from './util/handle_errors';
import {
  fieldSpecSchema,
  runtimeFieldSpecSchema,
  serializedFieldFormatSchema,
} from './util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStartDependencies, DataViewsServerPluginStart } from '../types';
import {
  DATA_VIEW_PATH,
  DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from '../constants';

const indexPatternSpecSchema = schema.object({
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
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSpecSchema)),
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
            data_view: serviceKey === SERVICE_KEY ? indexPatternSpecSchema : schema.never(),
            index_pattern:
              serviceKey === SERVICE_KEY_LEGACY ? indexPatternSpecSchema : schema.never(),
          }),
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const savedObjectsClient = ctx.core.savedObjects.client;
          const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          usageCollection?.incrementCounter({ counterName: path });
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const body = req.body;

          const spec = serviceKey === SERVICE_KEY ? body.data_view : body.index_pattern;

          const indexPattern = await indexPatternsService.createAndSave(
            spec as DataViewSpec,
            body.override,
            !body.refresh_fields
          );

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: JSON.stringify({
              [serviceKey]: indexPattern.toSpec(),
            }),
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
