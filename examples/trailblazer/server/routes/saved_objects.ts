/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { MAX_NAME_LENGTH, SAVED_OBJECTS_ROUTE } from '../../common';
import type { SavedObjectsResponse } from '../../common/saved_objects';
import { SAVED_OBJECTS_PAGE_SIZE } from '../../common/saved_objects';
import { toErrorResponse } from '../lib/error_response';
import { routeSecurity } from '../lib/route_config';
import { getSavedObjectsAccess, toSummary } from '../lib/saved_objects';

const MAX_PAGE = 100;

export function registerSavedObjectsRoute(router: IRouter) {
  router.get(
    {
      path: SAVED_OBJECTS_ROUTE,
      security: routeSecurity,
      validate: {
        query: schema.object({
          type: schema.string({ minLength: 1, maxLength: MAX_NAME_LENGTH }),
          search: schema.maybe(schema.string({ maxLength: MAX_NAME_LENGTH })),
          page: schema.number({ defaultValue: 1, min: 1, max: MAX_PAGE }),
        }),
      },
    },
    async (context, request, response) => {
      const { type, search, page } = request.query;
      const { client, typeRegistry } = await getSavedObjectsAccess(context);
      if (!typeRegistry.getType(type)) {
        return response.notFound({ body: { message: `Unknown saved object type [${type}]` } });
      }

      try {
        const term = search?.trim();
        const result = await client.find<unknown>({
          type,
          search: term ? `${term}*` : undefined,
          page,
          perPage: SAVED_OBJECTS_PAGE_SIZE,
          namespaces: ['*'],
          sortField: 'updated_at',
          sortOrder: 'desc',
        });
        const body: SavedObjectsResponse = {
          total: result.total,
          objects: result.saved_objects.map((object) => toSummary(typeRegistry, object)),
        };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}
