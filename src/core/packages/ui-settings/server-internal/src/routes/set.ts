/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'node:path';
import { schema, ValidationError } from '@kbn/config-schema';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type {
  InternalUiSettingsRequestHandlerContext,
  InternalUiSettingsRouter,
} from '../internal_types';
import { CannotOverrideError } from '../ui_settings_errors';
import { OAS_TAGS, settingsResponseSchema, settingKeyParamSchema } from './oas';

const validate = {
  params: schema.object({
    key: settingKeyParamSchema,
  }),
  body: schema.object({
    value: schema.any({
      meta: { description: 'The new value for the setting. Its type depends on the setting.' },
    }),
  }),
};

export function registerSetRoute(router: InternalUiSettingsRouter) {
  const setFromRequest = async (
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
  };
  router.post(
    {
      path: '/api/kibana/settings/{key}',
      validate: {
        request: validate,
        response: {
          200: { body: () => settingsResponseSchema, description: 'Indicates a successful call.' },
        },
      },
      options: {
        access: 'public',
        summary: 'Update an advanced setting',
        description: `Update the value of a single advanced setting in the current space. Requires the \`manage_advanced_settings\` privilege.`,
        tags: OAS_TAGS,
        oasOperationObject: () => path.resolve(__dirname, './set.examples.yaml'),
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_advanced_settings'],
        },
      },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return await setFromRequest(uiSettingsClient, context, request, response);
    }
  );
  router.post(
    {
      path: '/api/kibana/global_settings/{key}',
      validate: {
        request: validate,
        response: {
          200: { body: () => settingsResponseSchema, description: 'Indicates a successful call.' },
        },
      },
      options: {
        access: 'public',
        summary: 'Update a global advanced setting',
        description: `Update the value of a single advanced setting that applies globally, across all spaces. Requires the \`manage_advanced_settings\` privilege.`,
        tags: OAS_TAGS,
        oasOperationObject: () => path.resolve(__dirname, './set.examples.yaml'),
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_advanced_settings'],
        },
      },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return await setFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
