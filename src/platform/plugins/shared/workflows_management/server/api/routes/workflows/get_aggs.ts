/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

const MAX_AGG_FIELDS = 25;

export function registerGetAggsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/aggs',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get workflow aggregations',
      description:
        'Retrieve distinct values and their counts for the specified workflow fields. Useful for building filters such as lists of tags or creators.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_aggs.yaml'),
        },
        validate: {
          request: {
            query: schema.object({
              fields: schema.arrayOf(
                schema.string({ meta: { description: 'Field name to aggregate.' } }),
                {
                  maxSize: MAX_AGG_FIELDS,
                  meta: { description: 'Fields to aggregate on.' },
                }
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { fields } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const aggs = await api.getWorkflowAggs(fields, spaceId);
          return response.ok({ body: aggs || {} });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
