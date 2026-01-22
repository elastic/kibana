/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

const MAX_AGG_FIELDS = 25;

export function registerGetWorkflowAggsRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/aggs',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        query: schema.object({
          fields: schema.arrayOf(schema.string(), { maxSize: MAX_AGG_FIELDS }),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { fields } = request.query as { fields: string[] };
        const spaceId = spaces.getSpaceId(request);
        const aggs = await api.getWorkflowAggs(fields, spaceId);

        return response.ok({ body: aggs || {} });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
