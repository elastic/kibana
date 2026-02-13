/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { WORKFLOW_ROUTE_OPTIONS } from './lib/route_constants';
import { handleRouteError } from './lib/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './lib/route_security';
import type { RouteDependencies } from './lib/types';
import { withLicenseCheck } from './lib/with_license_check';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import { GetWorkflowsRequestQuery } from '../../common/model/api/workflows.gen';

export function registerGetWorkflowsRoute({ router, api, spaces }: RouteDependencies) {
  router.versioned
    .get({
      access: 'public',
      path: WORKFLOWS_API_PATHS.LIST,
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: {
            query: buildRouteValidationWithZod(GetWorkflowsRequestQuery),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const { size, page, enabled, createdBy, tags, query } = request.query;
          const spaceId = spaces.getSpaceId(request);
          return response.ok({
            body: await api.getWorkflows(
              {
                size: size ?? 100,
                page: page ?? 1,
                enabled,
                createdBy,
                tags,
                query,
              },
              spaceId
            ),
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
