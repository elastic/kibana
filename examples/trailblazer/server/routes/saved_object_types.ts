/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import type { AggregationsStringTermsAggregate } from '@elastic/elasticsearch/lib/api/types';
import { SAVED_OBJECT_TYPES_ROUTE } from '../../common';
import type { SavedObjectTypesResponse } from '../../common/saved_objects';
import { toErrorResponse } from '../lib/error_response';
import { routeSecurity } from '../lib/route_config';
import { getSavedObjectsAccess } from '../lib/saved_objects';

export function registerSavedObjectTypesRoute(router: IRouter) {
  router.get(
    { path: SAVED_OBJECT_TYPES_ROUTE, security: routeSecurity, validate: {} },
    async (context, request, response) => {
      const { client, typeRegistry, typeNames } = await getSavedObjectsAccess(context);

      try {
        const result = await client.find<unknown, { types: AggregationsStringTermsAggregate }>({
          type: typeNames,
          perPage: 0,
          namespaces: ['*'],
          aggs: { types: { terms: { field: 'type', size: typeNames.length } } },
        });

        const buckets = result.aggregations?.types.buckets;
        const counts = new Map<string, number>(
          (Array.isArray(buckets) ? buckets : []).map(({ key, doc_count: count }) => [
            String(key),
            count,
          ])
        );

        const body: SavedObjectTypesResponse = {
          total: result.total,
          types: typeRegistry
            .getAllTypes()
            .map(({ name, hidden, namespaceType, management }) => ({
              name,
              displayName: management?.displayName ?? name,
              hidden,
              namespaceType,
              count: counts.get(name) ?? 0,
            }))
            .sort((a, b) => a.name.localeCompare(b.name)),
        };
        return response.ok({ body });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
}
