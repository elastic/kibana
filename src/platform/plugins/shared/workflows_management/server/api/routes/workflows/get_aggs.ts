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
const FIELDS_DENY_LIST = new Set(['_id', '_index', '_score', '_source']);

const fieldSchema = schema.string({
  meta: { description: 'Field name to aggregate.' },
  validate: (field) =>
    !FIELDS_DENY_LIST.has(field) ? undefined : 'Field is not allowed for aggregation.',
});

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
              fields: schema.oneOf(
                [
                  fieldSchema,
                  schema.arrayOf(fieldSchema, {
                    maxSize: MAX_AGG_FIELDS,
                    meta: { description: 'Fields to aggregate on.' },
                  }),
                ],
                { meta: { description: 'Field or fields to aggregate on.' } }
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { fields: rawFields } = request.query;
          const fields = Array.isArray(rawFields) ? rawFields : [rawFields];
          const spaceId = spaces.getSpaceId(request);
          const aggs = await api.getWorkflowAggs(fields, spaceId);
          return response.ok({ body: aggs || {} });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
