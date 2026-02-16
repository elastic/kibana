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

export function registerUpdateMiniAppRoute(router: IRouter, logger: Logger) {
  router.put(
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
        body: schema.object({
          name: schema.maybe(schema.string({ minLength: 1, maxLength: 255 })),
          script_code: schema.maybe(schema.string()),
        }),
      },
    },
    async (context, request, response) => {
      try {
        const { id } = request.params;
        const { name, script_code } = request.body;
        const coreContext = await context.core;
        const savedObjectsClient = coreContext.savedObjects.client;

        // Get existing mini app to merge with updates
        const existing = await savedObjectsClient.get<MiniAppAttributes>(
          MINI_APP_SAVED_OBJECT_TYPE,
          id
        );

        const now = new Date().toISOString();
        const updatedAttributes: Partial<MiniAppAttributes> = {
          updated_at: now,
        };

        if (name !== undefined) {
          updatedAttributes.name = name;
        }
        if (script_code !== undefined) {
          updatedAttributes.script_code = script_code;
        }

        await savedObjectsClient.update<MiniAppAttributes>(
          MINI_APP_SAVED_OBJECT_TYPE,
          id,
          updatedAttributes
        );

        // Fetch the updated object to return complete data
        const updated = await savedObjectsClient.get<MiniAppAttributes>(
          MINI_APP_SAVED_OBJECT_TYPE,
          id
        );

        const miniApp: MiniApp = {
          id: updated.id,
          name: updated.attributes.name,
          script_code: updated.attributes.script_code,
          created_at: updated.attributes.created_at ?? existing.attributes.created_at,
          updated_at: updated.attributes.updated_at,
        };

        return response.ok({ body: miniApp });
      } catch (error) {
        if ((error as { isBoom?: boolean })?.isBoom) {
          return response.notFound({ body: { message: 'Mini app not found' } });
        }
        logger.error(`Failed to update mini app: ${error}`);
        return response.customError({
          statusCode: 500,
          body: { message: 'Failed to update mini app' },
        });
      }
    }
  );
}
