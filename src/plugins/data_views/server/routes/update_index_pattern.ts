/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { handleErrors } from './util/handle_errors';
import {
  fieldSpecSchema,
  runtimeFieldSpecSchema,
  serializedFieldFormatSchema,
} from './util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../core/server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../types';

const indexPatternUpdateSchema = schema.object({
  title: schema.maybe(schema.string()),
  type: schema.maybe(schema.string()),
  typeMeta: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  timeFieldName: schema.maybe(schema.string()),
  intervalName: schema.maybe(schema.string()),
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
  runtimeFieldMap: schema.maybe(schema.recordOf(schema.string(), runtimeFieldSpecSchema)),
});

export const registerUpdateIndexPatternRoute = (
  router: IRouter,
  getStartServices: StartServicesAccessor<
    DataViewsServerPluginStartDependencies,
    DataViewsServerPluginStart
  >
) => {
  router.post(
    {
      path: '/api/index_patterns/index_pattern/{id}',
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
          index_pattern: indexPatternUpdateSchema,
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
        const id = req.params.id;

        const indexPattern = await indexPatternsService.get(id);

        const {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          refresh_fields = true,
          index_pattern: {
            title,
            timeFieldName,
            intervalName,
            sourceFilters,
            fieldFormats,
            type,
            typeMeta,
            fields,
            runtimeFieldMap,
          },
        } = req.body;

        let changeCount = 0;
        let doRefreshFields = false;

        if (title !== undefined && title !== indexPattern.title) {
          changeCount++;
          indexPattern.title = title;
        }

        if (timeFieldName !== undefined && timeFieldName !== indexPattern.timeFieldName) {
          changeCount++;
          indexPattern.timeFieldName = timeFieldName;
        }

        if (intervalName !== undefined && intervalName !== indexPattern.intervalName) {
          changeCount++;
          indexPattern.intervalName = intervalName;
        }

        if (sourceFilters !== undefined) {
          changeCount++;
          indexPattern.sourceFilters = sourceFilters;
        }

        if (fieldFormats !== undefined) {
          changeCount++;
          indexPattern.fieldFormatMap = fieldFormats;
        }

        if (type !== undefined) {
          changeCount++;
          indexPattern.type = type;
        }

        if (typeMeta !== undefined) {
          changeCount++;
          indexPattern.typeMeta = typeMeta;
        }

        if (fields !== undefined) {
          changeCount++;
          doRefreshFields = true;
          indexPattern.fields.replaceAll(
            Object.values(fields || {}).map((field) => ({
              ...field,
              aggregatable: true,
              searchable: true,
            }))
          );
        }

        if (runtimeFieldMap !== undefined) {
          changeCount++;
          indexPattern.replaceAllRuntimeFields(runtimeFieldMap);
        }

        if (changeCount < 1) {
          throw new Error('Index pattern change set is empty.');
        }

        await indexPatternsService.updateSavedObject(indexPattern);

        if (doRefreshFields && refresh_fields) {
          await indexPatternsService.refreshFields(indexPattern);
        }

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
