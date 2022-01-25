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
import { handleErrors } from '../util/handle_errors';
import { serializedFieldFormatSchema } from '../util/schemas';
import { IRouter, StartServicesAccessor } from '../../../../../core/server';
import { FieldFormatParams, SerializedFieldFormat } from '../../../../field_formats/common';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
} from '../../constants';

interface UpdateFieldsArgs {
  indexPatternsService: DataViewsService;
  usageCollection?: UsageCounter;
  path: string;
  id: string;
  fields: Record<string, FieldUpdateType>;
}

export const updateFields = async ({
  indexPatternsService,
  usageCollection,
  path,
  id,
  fields,
}: UpdateFieldsArgs) => {
  usageCollection?.incrementCounter({ counterName: `POST ${path}` });
  const indexPattern = await indexPatternsService.get(id);

  const fieldNames = Object.keys(fields);

  if (fieldNames.length < 1) {
    throw new Error('No fields provided.');
  }

  let changeCount = 0;
  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (field.customLabel !== undefined) {
      changeCount++;
      indexPattern.setFieldCustomLabel(fieldName, field.customLabel);
    }

    if (field.count !== undefined) {
      changeCount++;
      indexPattern.setFieldCount(fieldName, field.count);
    }

    if (field.format !== undefined) {
      changeCount++;
      if (field.format) {
        indexPattern.setFieldFormat(fieldName, field.format);
      } else {
        indexPattern.deleteFieldFormat(fieldName);
      }
    }
  }

  if (changeCount < 1) {
    throw new Error('Change set is empty.');
  }

  await indexPatternsService.updateSavedObject(indexPattern);
  return indexPattern;
};

interface FieldUpdateType {
  customLabel?: string;
  count?: number;
  format?: SerializedFieldFormat<FieldFormatParams>;
}

const fieldUpdateSchema = schema.object({
  customLabel: schema.maybe(
    schema.string({
      minLength: 1,
      maxLength: 1_000,
    })
  ),
  count: schema.maybe(schema.maybe(schema.number())),
  format: schema.maybe(schema.maybe(serializedFieldFormatSchema)),
});

const updateFieldsActionRouteFactory = (path: string, serviceKey: string) => {
  return (
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
            fields: schema.recordOf(
              schema.string({
                minLength: 1,
                maxLength: 1_000,
              }),
              fieldUpdateSchema
            ),
          }),
        },
      },
      router.handleLegacyErrors(
        handleErrors(async (ctx, req, res) => {
          const savedObjectsClient = ctx.core.savedObjects.client;
          const elasticsearchClient = ctx.core.elasticsearch.client.asCurrentUser;
          const [, , { dataViewsServiceFactory }] = await getStartServices();
          const indexPatternsService = await dataViewsServiceFactory(
            savedObjectsClient,
            elasticsearchClient,
            req
          );
          const id = req.params.id;
          const { fields } = req.body;

          const indexPattern = await updateFields({
            indexPatternsService,
            usageCollection,
            id,
            fields,
            path,
          });

          return res.ok({
            headers: {
              'content-type': 'application/json',
            },
            body: {
              [serviceKey]: indexPattern.toSpec(),
            },
          });
        })
      )
    );
  };
};

export const registerUpdateFieldsRouteLegacy = updateFieldsActionRouteFactory(
  `${SPECIFIC_DATA_VIEW_PATH}/fields`,
  SERVICE_KEY
);

export const registerUpdateFieldsRoute = updateFieldsActionRouteFactory(
  `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/fields`,
  SERVICE_KEY_LEGACY
);
