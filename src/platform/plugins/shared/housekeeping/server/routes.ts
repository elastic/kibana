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
import { HOUSEKEEPING_FINDINGS_API_PATH, HOUSEKEEPING_RESOURCE_API_PATH } from '../common';
import type { HousekeepingRegistry } from './registry';
import { runHousekeeping } from './run';

const resourceTypeSchema = schema.string({ maxLength: 100 });

const querySchema = schema.object({
  resourceType: schema.maybe(
    schema.oneOf([resourceTypeSchema, schema.arrayOf(resourceTypeSchema, { maxSize: 50 })])
  ),
  resourceId: schema.maybe(schema.string({ maxLength: 1000 })),
});

interface Dependencies {
  router: IRouter;
  registry: HousekeepingRegistry;
  logger: Logger;
  isServerless: boolean;
}

export const registerRoutes = ({ router, registry, logger, isServerless }: Dependencies) => {
  router.get(
    {
      path: HOUSEKEEPING_FINDINGS_API_PATH,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on the Elasticsearch client of the current user for authorization',
        },
      },
      validate: { query: querySchema },
    },
    async (context, request, response) => {
      const { elasticsearch, savedObjects } = await context.core;
      const { resourceType, resourceId } = request.query;

      const controller = new AbortController();
      const subscription = request.events.aborted$.subscribe(() => controller.abort());

      try {
        const body = await runHousekeeping({
          registry,
          context: {
            esClient: elasticsearch.client.asCurrentUser,
            savedObjectsClient: savedObjects.client,
            isServerless,
            logger,
          },
          abortSignal: controller.signal,
          scope: { resourceTypes: resourceType ? [resourceType].flat() : undefined, resourceId },
        });
        return response.ok({ body });
      } finally {
        subscription.unsubscribe();
      }
    }
  );

  router.get(
    {
      path: `${HOUSEKEEPING_RESOURCE_API_PATH}/{type}/{id}`,
      security: {
        authz: {
          enabled: false,
          reason: 'Relies on the Elasticsearch client of the current user for authorization',
        },
      },
      validate: {
        params: schema.object({
          type: resourceTypeSchema,
          id: schema.string({ maxLength: 1000 }),
        }),
      },
    },
    async (context, request, response) => {
      const { type, id } = request.params;
      const describe = registry.getResourceType(type)?.describe;
      if (!describe) {
        return response.notFound();
      }

      const { elasticsearch, savedObjects } = await context.core;
      const controller = new AbortController();
      const subscription = request.events.aborted$.subscribe(() => controller.abort());
      try {
        const definition = await describe(id, {
          esClient: elasticsearch.client.asCurrentUser,
          savedObjectsClient: savedObjects.client,
          isServerless,
          logger,
          abortSignal: controller.signal,
          fetchOnce: (_key, fetch) => fetch(controller.signal),
        });
        return response.ok({ body: { definition } });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.debug(`Could not describe ${type} [${id}]: ${message}`);
        return response.customError({
          statusCode: error?.statusCode ?? error?.meta?.statusCode ?? 500,
          body: { message },
        });
      } finally {
        subscription.unsubscribe();
      }
    }
  );
};
