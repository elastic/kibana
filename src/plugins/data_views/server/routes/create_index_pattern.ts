/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { IndexPatternSpec } from 'src/plugins/data_views/common';
import { handleErrors } from './util/handle_errors';
import {
  fieldSpecSchema,
  runtimeFieldSpecSchema,
  serializedFieldFormatSchema,
} from './util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';

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

export const registerCreateIndexPatternRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern',
      validate: {
        body: schema.object({
          override: schema.maybe(schema.boolean({ defaultValue: false })),
          refresh_fields: schema.maybe(schema.boolean({ defaultValue: false })),
          index_pattern: indexPatternSpecSchema,
        }),
      },
    },
    router.handleLegacyErrors(
      handleErrors(async (ctx, req, res) => {
        const savedObjectsClient = ctx.core.savedObjects.client;
        const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
        const [, , { indexPatternsServiceFactory }] = await getStartServices();
        const indexPatternsService = await indexPatternsServiceFactory(
          savedObjectsClient,
          elasticsearchClient
        );
        const body = req.body;

        const indexPattern = await indexPatternsService.createAndSave(
          body.index_pattern as IndexPatternSpec,
          body.override,
          !body.refresh_fields
        );

        return res.ok({
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            index_pattern: indexPattern.toSpec(),
          }),
        });
      })
    )
  );
};
