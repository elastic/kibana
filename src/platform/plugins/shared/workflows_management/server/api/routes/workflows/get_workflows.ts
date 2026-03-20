/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, MAX_PAGE_SIZE, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerGetWorkflowsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get workflows',
      description: 'Retrieve a paginated list of workflows with optional filtering.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            query: schema.object({
              size: schema.maybe(
                schema.number({ min: 1, meta: { description: 'Number of results per page.' } })
              ),
              page: schema.maybe(schema.number({ min: 1, meta: { description: 'Page number.' } })),
              enabled: schema.maybe(
                schema.arrayOf(schema.boolean(), {
                  meta: { description: 'Filter by enabled state.' },
                })
              ),
              createdBy: schema.maybe(
                schema.arrayOf(schema.string(), { meta: { description: 'Filter by creator.' } })
              ),
              tags: schema.maybe(
                schema.arrayOf(schema.string(), {
                  meta: { description: 'Filter by tags.' },
                })
              ),
              query: schema.maybe(
                schema.string({ meta: { description: 'Free-text search query.' } })
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { size, page, enabled, createdBy, tags, query } = request.query;
          const spaceId = spaces.getSpaceId(request);
          return response.ok({
            body: await api.getWorkflows(
              { size: size ?? MAX_PAGE_SIZE, page: page ?? 1, enabled, createdBy, tags, query },
              spaceId
            ),
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
