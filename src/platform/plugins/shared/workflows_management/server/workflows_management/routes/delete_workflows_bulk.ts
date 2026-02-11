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
import { WORKFLOW_DELETE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

const MAX_BULK_DELETE_BATCH_SIZE = 1000;

export function registerDeleteWorkflowsBulkRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.delete(
    {
      path: '/api/workflows',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_DELETE_SECURITY,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string(), { maxSize: MAX_BULK_DELETE_BATCH_SIZE }),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { ids } = request.body as { ids: string[] };
        const spaceId = spaces.getSpaceId(request);
        const result = await api.deleteWorkflows(ids, spaceId, request);
        return response.ok({ body: result });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
