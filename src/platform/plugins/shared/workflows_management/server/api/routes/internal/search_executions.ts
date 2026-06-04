/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { schema } from '@kbn/config-schema';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../../../common';
import { isIndexNotFoundError } from '../../lib/es_error_helpers';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTION_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const emptyExecutionsSearchResponse = (): estypes.SearchResponse<unknown> => ({
  took: 0,
  timed_out: false,
  _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
  hits: {
    total: { value: 0, relation: 'eq' },
    max_score: null,
    hits: [],
  },
});

export function registerSearchExecutionsRoute({ router, service, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/internal/workflows/executions/_search',
      access: 'internal',
      security: WORKFLOW_EXECUTION_READ_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              query: schema.maybe(schema.object({}, { unknowns: 'allow' })),
              sort: schema.maybe(schema.arrayOf(schema.object({}, { unknowns: 'allow' }))),
              from: schema.maybe(schema.number({ min: 0 })),
              size: schema.maybe(schema.number({ min: 1, max: 1000 })),
              trackTotalHits: schema.maybe(schema.boolean()),
            }),
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        try {
          const coreStart = await service.getCoreStart();
          const esClient = coreStart.elasticsearch.client.asInternalUser;
          const spaceId = spaces.getSpaceId(request);

          const spaceFilter: estypes.QueryDslQueryContainer = {
            bool: {
              should: [
                { term: { spaceId } },
                { bool: { must_not: { exists: { field: 'spaceId' } } } },
              ],
              minimum_should_match: 1,
            },
          };

          const query: estypes.QueryDslQueryContainer = {
            bool: {
              must: [
                (request.body.query as estypes.QueryDslQueryContainer | undefined) ?? {
                  match_all: {},
                },
                spaceFilter,
              ],
              must_not: [{ exists: { field: 'stepId' } }],
            },
          };

          const esResponse = await esClient.search({
            index: WORKFLOWS_EXECUTIONS_INDEX,
            query,
            sort: request.body.sort as estypes.SortCombinations | undefined,
            from: request.body.from,
            size: request.body.size,
            track_total_hits: request.body.trackTotalHits ?? true,
          });

          return response.ok({ body: esResponse });
        } catch (error) {
          if (isIndexNotFoundError(error)) {
            return response.ok({ body: emptyExecutionsSearchResponse() });
          }
          return handleRouteError(response, error);
        }
      })
    );
}
