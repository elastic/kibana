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
import { WORKFLOW_UPDATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerPostRestoreWorkflowRoute({ router, api, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/{id}/restore',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_UPDATE_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: schema.object({
          eventId: schema.string(),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const { eventId } = request.body as { eventId: string };
        const spaceId = spaces.getSpaceId(request);
        const result = await api.restoreWorkflow(id, spaceId, eventId, request);
        return response.ok({ body: result });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
