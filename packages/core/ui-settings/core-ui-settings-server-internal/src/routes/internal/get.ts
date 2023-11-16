/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import { KibanaRequest, KibanaResponseFactory } from '@kbn/core-http-server';
import { InternalUiSettingsRequestHandlerContext } from '../../internal_types';
import type { InternalUiSettingsRouter } from '../../internal_types';

export function registerInternalGetRoute(router: InternalUiSettingsRouter) {
  const getFromRequest = async (
    uiSettingsClient: IUiSettingsClient,
    context: InternalUiSettingsRequestHandlerContext,
    request: KibanaRequest<unknown, unknown, unknown, 'get'>,
    response: KibanaResponseFactory
  ) => {
    try {
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

      throw error;
    }
  };
  router.get(
    { path: '/internal/kibana/settings', validate: false, options: { access: 'internal' } },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.client;
      return await getFromRequest(uiSettingsClient, context, request, response);
    }
  );
  router.get(
    { path: '/internal/kibana/global_settings', validate: false, options: { access: 'internal' } },
    async (context, request, response) => {
      const uiSettingsClient = (await context.core).uiSettings.globalClient;
      return await getFromRequest(uiSettingsClient, context, request, response);
    }
  );
}
