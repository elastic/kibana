/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { UpdateWorkflowCommandSchema } from '@kbn/workflows';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_UPDATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

export function registerPutUpdateWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.put(
    {
      path: '/api/workflows/{id}',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_UPDATE_SECURITY,
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
        body: UpdateWorkflowCommandSchema.partial(),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { id } = request.params as { id: string };
        const spaceId = spaces.getSpaceId(request);
        const updated = await api.updateWorkflow(id, request.body, spaceId, request);
        if (updated === null) {
          return response.notFound();
        }
        return response.ok({
          body: updated,
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
