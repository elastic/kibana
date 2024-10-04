/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { ValidationBadValueError, ValidationSettingNotFoundError } from '../../ui_settings_errors';
import type {
  InternalUiSettingsRequestHandlerContext,
  InternalUiSettingsRouter,
} from '../../internal_types';

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

      const { valid, errorMessage } = await uiSettingsClient.validate(key, value);

      return response.ok({
        body: {
          valid,
          errorMessage,
        },
      });
    } catch (error) {
      if (error instanceof ValidationSettingNotFoundError) {
        return response.notFound({ body: error });
      }

      if (error instanceof ValidationBadValueError) {
        return response.badRequest({ body: error });
      }

      throw error;
    }
  };
  router.post(
    {
      path: '/internal/kibana/settings/{key}/validate',
      validate: {
        params: schema.object({
          key: schema.string(),
        }),
        body: schema.object({
          value: schema.any(),
        }),
      },
      options: { access: 'internal' },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return await validateFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
