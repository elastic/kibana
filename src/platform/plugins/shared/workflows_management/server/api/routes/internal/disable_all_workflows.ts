/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_UPDATE_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerDisableAllWorkflowsRoute({ router, api }: RouteDependencies) {
  router.versioned
    .post({
      path: '/internal/workflows/disable_all_workflows',
      access: 'internal',
      security: WORKFLOW_UPDATE_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withLicenseCheck(async (_context, _request, response) => {
        const result = await api.disableAllWorkflows();
        return response.ok({
          body: result,
        });
      })
    );
}
