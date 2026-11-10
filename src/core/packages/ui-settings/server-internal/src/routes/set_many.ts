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
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { InternalUiSettingsRouter } from '../internal_types';
import { CannotOverrideError } from '../ui_settings_errors';
import { OAS_TAGS, settingsResponseSchema } from './oas';
import type { InternalUiSettingsRequestHandlerContext } from '../internal_types';

const validate = {
  body: schema.object({
    changes: schema.object(
      {},
      {
        unknowns: 'allow',
        meta: {
          description:
            'An object of setting names to their new values. Set a value to `null` to reset that setting to its default.',
        },
      }
    ),
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
  router.post(
    {
      path: '/api/kibana/settings',
      validate: {
        request: validate,
        response: {
          200: { body: () => settingsResponseSchema, description: 'Indicates a successful call.' },
        },
      },
      options: {
        access: 'public',
        summary: 'Update many advanced settings',
        description: `Update the values of multiple advanced settings in the current space in one request. Requires the \`manage_advanced_settings\` privilege.`,
        tags: OAS_TAGS,
        oasOperationObject: () => path.resolve(__dirname, './set_many.examples.yaml'),
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_advanced_settings'],
        },
      },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return await setManyFromRequest(uiSettingsClient, context, request, response);
    }
  );

  router.post(
    {
      path: '/api/kibana/global_settings',
      validate: {
        request: validate,
        response: {
          200: { body: () => settingsResponseSchema, description: 'Indicates a successful call.' },
        },
      },
      options: {
        access: 'public',
        summary: 'Update many global advanced settings',
        description: `Update the values of multiple advanced settings that apply globally, across all spaces, in one request. Requires the \`manage_advanced_settings\` privilege.`,
        tags: OAS_TAGS,
        oasOperationObject: () => path.resolve(__dirname, './set_many.examples.yaml'),
      },
      security: {
        authz: {
          requiredPrivileges: ['manage_advanced_settings'],
        },
      },
    },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return await setManyFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
