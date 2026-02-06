/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { schema } from '@kbn/config-schema';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { DataViewsService } from '../../../../common';
import { handleErrors } from '../util/handle_errors';
import { serializedFieldFormatSchema } from '../../../schemas';
import { MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH } from '../../../../common/constants';
import { dataViewSpecSchema } from '../../schema';
import type { DataViewSpecRestResponse } from '../../route_types';
import type {
  DataViewsServerPluginStartDependencies,
  DataViewsServerPluginStart,
} from '../../../types';
import {
  SPECIFIC_DATA_VIEW_PATH,
  SPECIFIC_DATA_VIEW_PATH_LEGACY,
  SERVICE_KEY,
  SERVICE_KEY_LEGACY,
  INITIAL_REST_VERSION,
  UPDATE_DATA_VIEW_FIELDS_DESCRIPTION,
} from '../../../constants';
import { toApiSpec } from '../util/to_api_spec';

interface UpdateFieldsArgs {
  dataViewsService: DataViewsService;
  usageCollection?: UsageCounter;
  counterName: string;
  id: string;
  fields: Record<string, FieldUpdateType>;
}

export const updateFields = async ({
  dataViewsService,
  usageCollection,
  counterName,
  id,
  fields,
}: UpdateFieldsArgs) => {
  usageCollection?.incrementCounter({ counterName });
  const dataView = await dataViewsService.getDataViewLazy(id);

  const fieldNames = Object.keys(fields);

  if (fieldNames.length < 1) {
    throw new Error('No fields provided.');
  }

  let changeCount = 0;
  for (const fieldName of fieldNames) {
    const field = fields[fieldName];

    if (field.customLabel !== undefined) {
      changeCount++;
      dataView.setFieldCustomLabel(fieldName, field.customLabel);
    }

    if (field.customDescription !== undefined) {
      changeCount++;
      dataView.setFieldCustomDescription(fieldName, field.customDescription);
    }

    if (field.count !== undefined) {
      changeCount++;
      dataView.setFieldCount(fieldName, field.count);
    }

    if (field.format !== undefined) {
      changeCount++;
      if (field.format) {
        dataView.setFieldFormat(fieldName, field.format);
      } else {
        dataView.deleteFieldFormat(fieldName);
      }
    }
  }

  if (changeCount < 1) {
    throw new Error('Change set is empty.');
  }

  await dataViewsService.updateSavedObject(dataView);
  return dataView;
};

interface FieldUpdateType {
  customLabel?: string | null;
  customDescription?: string | null;
  count?: number | null;
  format?: SerializedFieldFormat | null;
}

const fieldUpdateSchema = schema.object({
  customLabel: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: 1_000,
      })
    )
  ),
  customDescription: schema.maybe(
    schema.nullable(
      schema.string({
        minLength: 1,
        maxLength: MAX_DATA_VIEW_FIELD_DESCRIPTION_LENGTH,
      })
    )
  ),
  count: schema.maybe(schema.nullable(schema.number())),
  format: schema.maybe(schema.nullable(serializedFieldFormatSchema)),
});

const updateFieldsActionRouteFactory = (path: string, serviceKey: string, description?: string) => {
  return (
    router: IRouter,
    getStartServices: StartServicesAccessor<
      DataViewsServerPluginStartDependencies,
      DataViewsServerPluginStart
    >,
    usageCollection?: UsageCounter
  ) => {
    router.versioned
      .post({
        path,
        access: 'public',
        description,
        security: {
          authz: {
            requiredPrivileges: ['indexPatterns:manage'],
          },
        },
      })
      .addVersion(
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
                fields: schema.recordOf(
                  schema.string({
                    minLength: 1,
                    maxLength: 1_000,
                  }),
                  fieldUpdateSchema
                ),
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
            const { fields } = req.body;

            const dataView = await updateFields({
              dataViewsService,
              usageCollection,
              id,
              fields,
              counterName: `${req.route.method} ${path}`,
            });

            const body: Record<string, DataViewSpecRestResponse> = {
              [serviceKey]: toApiSpec(await dataView.toSpec({ fieldParams: { fieldName: ['*'] } })),
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
};

export const registerUpdateFieldsRoute = updateFieldsActionRouteFactory(
  `${SPECIFIC_DATA_VIEW_PATH}/fields`,
  SERVICE_KEY,
  UPDATE_DATA_VIEW_FIELDS_DESCRIPTION
);

export const registerUpdateFieldsRouteLegacy = updateFieldsActionRouteFactory(
  `${SPECIFIC_DATA_VIEW_PATH_LEGACY}/fields`,
  SERVICE_KEY_LEGACY
);
