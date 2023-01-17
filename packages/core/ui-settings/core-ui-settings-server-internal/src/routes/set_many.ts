/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema, ValidationError } from '@kbn/config-schema';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-common';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { InternalUiSettingsRouter } from '../internal_types';
import { CannotOverrideError } from '../ui_settings_errors';
import { InternalUiSettingsRequestHandlerContext } from '../internal_types';

const validate = {
  body: schema.object({
    changes: schema.object({}, { unknowns: 'allow' }),
  }),
};

export function registerSetManyRoute(router: InternalUiSettingsRouter) {
  const setManyFromRequest = async (
    uiSettingsClient: IUiSettingsClient,
    context: InternalUiSettingsRequestHandlerContext,
    request: KibanaRequest<unknown, unknown, Readonly<{} & { changes?: any & {} }>, 'post'>,
    response: KibanaResponseFactory
  ) => {
    try {
      const { changes } = request.body;

      await uiSettingsClient.setMany(changes);

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
  };
  router.post({ path: '/api/kibana/settings', validate }, async (context, request, response) => {
    const uiSettingsClient = (await context.core).uiSettings.client;
    return await setManyFromRequest(uiSettingsClient, context, request, response);
  });

  router.post(
    { path: '/api/kibana/global_settings', validate },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return await setManyFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
