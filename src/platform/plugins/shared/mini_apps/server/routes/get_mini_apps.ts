/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, Logger } from '@kbn/core/server';
import { MINI_APPS_API_BASE, MINI_APP_SAVED_OBJECT_TYPE } from '../../common';
import type { MiniAppAttributes, MiniApp } from '../../common';

export function registerGetMiniAppsRoute(router: IRouter, logger: Logger) {
  router.get(
    {
      path: MINI_APPS_API_BASE,
      security: {
        authz: {
          requiredPrivileges: ['miniApps'],
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      try {
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        const result = await savedObjectsClient.find<MiniAppAttributes>({
          type: MINI_APP_SAVED_OBJECT_TYPE,
          perPage: 1000,
          sortField: 'updated_at',
          sortOrder: 'desc',
        });

        const miniApps: MiniApp[] = result.saved_objects.map((so) => ({
          id: so.id,
          name: so.attributes.name,
          script_code: so.attributes.script_code,
          created_at: so.attributes.created_at,
          updated_at: so.attributes.updated_at,
          versions: [],
        }));

        return response.ok({ body: { items: miniApps, total: result.total } });
      } catch (error) {
        logger.error(`Failed to get mini apps: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to get mini apps' },
        });
      }
    }
  );
}
