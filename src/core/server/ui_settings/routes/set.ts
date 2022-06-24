/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, ValidationError } from '@kbn/config-schema';

import { IRouter } from '../../http';
import { SavedObjectsErrorHelpers } from '../../saved_objects';
import { CannotOverrideError } from '../ui_settings_errors';

const validate = {
  params: schema.object({
    key: schema.string(),
  }),
  body: schema.object({
    value: schema.any(),
  }),
};

export function registerSetRoute(router: IRouter) {
  router.post(
    { path: '/api/kibana/settings/{key}', validate },
    async (context, request, response) => {
      try {
        const uiSettingsClient = (await context.core).uiSettings.client;

        const { key } = request.params;
        const { value } = request.body;

        await uiSettingsClient.set(key, value);

        return response.ok({
          body: {
            settings: await uiSettingsClient.getUserProvided(),
          },
        });
      } catch (error) {
        if (SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
          return response.customError({
            body: error,
            statusCode: error.output.statusCode,
          });
        }

        if (error instanceof CannotOverrideError || error instanceof ValidationError) {
          return response.badRequest({ body: error });
        }

        throw error;
      }
    }
  );
}
