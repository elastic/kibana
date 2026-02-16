/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { MINI_APPS_API_BASE, MINI_APP_SAVED_OBJECT_TYPE } from '../../common';

export function registerDeleteMiniAppRoute(router: IRouter, logger: Logger) {
  router.delete(
    {
      path: `${MINI_APPS_API_BASE}/{id}`,
      security: {
        authz: {
          requiredPrivileges: ['miniApps'],
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params;
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        await savedObjectsClient.delete(MINI_APP_SAVED_OBJECT_TYPE, id);

        return response.ok({ body: { success: true } });
      } catch (error) {
        if ((error as { isBoom?: boolean })?.isBoom) {
          return response.notFound({ body: { message: 'Mini app not found' } });
        }
        logger.error(`Failed to delete mini app: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to delete mini app' },
        });
      }
    }
  );
}
