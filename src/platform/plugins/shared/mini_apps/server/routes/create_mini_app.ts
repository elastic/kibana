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

export function registerCreateMiniAppRoute(router: IRouter, logger: Logger) {
  router.post(
    {
      path: MINI_APPS_API_BASE,
      security: {
        authz: {
          requiredPrivileges: ['miniApps'],
        },
      },
      validate: {
        body: schema.object({
          name: schema.string({ minLength: 1, maxLength: 255 }),
          script_code: schema.string({ defaultValue: '' }),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { name, script_code } = request.body;
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        const now = new Date().toISOString();
        const attributes: MiniAppAttributes = {
          name,
          script_code,
          created_at: now,
          updated_at: now,
          versions: [],
        };

        const savedObject = await savedObjectsClient.create<MiniAppAttributes>(
          MINI_APP_SAVED_OBJECT_TYPE,
          attributes
        );

        const miniApp: MiniApp = {
          id: savedObject.id,
          name: savedObject.attributes.name,
          script_code: savedObject.attributes.script_code,
          created_at: savedObject.attributes.created_at,
          updated_at: savedObject.attributes.updated_at,
          versions: [],
        };

        return response.ok({ body: miniApp });
      } catch (error) {
        logger.error(`Failed to create mini app: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to create mini app' },
        });
      }
    }
  );
}
