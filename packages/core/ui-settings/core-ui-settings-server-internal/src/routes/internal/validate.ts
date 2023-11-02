/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type {
  InternalUiSettingsRequestHandlerContext,
  InternalUiSettingsRouter,
} from '../../internal_types';

const validate = {
  params: schema.object({
    key: schema.string(),
  }),
  body: schema.object({
    value: schema.any(),
  }),
};

export function registerInternalValidateRoute(router: InternalUiSettingsRouter) {
  const validateFromRequest = async (
    uiSettingsClient: IUiSettingsClient,
    context: InternalUiSettingsRequestHandlerContext,
    request: KibanaRequest<
      Readonly<{} & { key: string }>,
      unknown,
      Readonly<{ value?: any } & {}>,
      'post'
    >,
    response: KibanaResponseFactory
  ) => {
    try {
      const { key } = request.params;
      const { value } = request.body;

      const errorMessage = await uiSettingsClient.getValidationErrorMessage(key, value);

      if (errorMessage) {
        return response.ok({
          body: {
            errorMessage,
          },
        });
      }
      return response.ok();
    } catch (error) {
      if (SavedObjectsErrorHelpers.isSavedObjectsClientError(error)) {
        return response.customError({
          body: error,
          statusCode: error.output.statusCode,
        });
      }

      throw error;
    }
  };
  router.post(
    { path: '/internal/kibana/settings/{key}/validate', validate, options: { access: 'internal' } },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return await validateFromRequest(uiSettingsClient, context, request, response);
    }
  );
  router.post(
    {
      path: '/internal/kibana/global_settings/{key}/validate',
      validate,
      options: { access: 'internal' },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return await validateFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
