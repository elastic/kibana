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

export function registerPostCheckConflictsRoute({ router, api, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/_check-conflicts',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string({ maxLength: 255 }), { minSize: 1, maxSize: 500 }),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const { ids } = request.body;

        const conflicts = await api.checkWorkflowConflicts(ids, spaceId);

        return response.ok({
          body: {
            conflicts: conflicts.map((c) => ({ id: c.id, existingName: c.name })),
          },
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
