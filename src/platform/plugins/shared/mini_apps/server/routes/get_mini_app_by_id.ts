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
import type { MiniAppAttributes, MiniApp } from '../../common';

export function registerGetMiniAppByIdRoute(router: IRouter, logger: Logger) {
  router.get(
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

        const savedObject = await savedObjectsClient.get<MiniAppAttributes>(
          MINI_APP_SAVED_OBJECT_TYPE,
          id
        );

        const miniApp: MiniApp = {
          id: savedObject.id,
          name: savedObject.attributes.name,
          script_code: savedObject.attributes.script_code,
          created_at: savedObject.attributes.created_at,
          updated_at: savedObject.attributes.updated_at,
          versions: savedObject.attributes.versions ?? [],
        };

        return response.ok({ body: miniApp });
      } catch (error) {
        if ((error as { isBoom?: boolean })?.isBoom) {
          return response.notFound({ body: { message: 'Mini app not found' } });
        }
        logger.error(`Failed to get mini app: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to get mini app' },
        });
      }
    }
  );
}
