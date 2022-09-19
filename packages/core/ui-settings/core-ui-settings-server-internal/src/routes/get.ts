/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-utils-server';
import type { InternalUiSettingsRouter } from '../internal_types';

export function registerGetRoute(router: InternalUiSettingsRouter) {
  router.get(
    { path: '/api/kibana/settings', validate: false },
    async (context, request, response) => {
      try {
        const uiSettingsClient = (await context.core).uiSettings.client;
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
    }
  );
}
