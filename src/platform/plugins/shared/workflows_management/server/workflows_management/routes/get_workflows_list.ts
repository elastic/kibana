/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';

/**
 * Register the GET /api/workflows/list route.
 *
 * Returns a lightweight list of workflows with just id and name.
 * Used by ES|QL editor autocomplete for the WORKFLOW command.
 *
 * Response format:
 * {
 *   workflows: [
 *     { id: "uuid-1", name: "my-workflow" },
 *     { id: "uuid-2", name: "another-workflow" }
 *   ]
 * }
 */
export function registerGetWorkflowsListRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/list',
      options: {
        ...WORKFLOW_ROUTE_OPTIONS,
        // Must be 'public' to allow external access from ES|QL editor
        access: 'public',
      },
      security: WORKFLOW_READ_SECURITY,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        logger.debug('ES|QL WORKFLOW: Fetching workflows list for autocomplete');

        // Fetch all workflows (limited to reasonable size for autocomplete)
        const searchResult = await api.getWorkflows(
          { size: 1000, page: 1 },
          spaceId
        );

        // Return lightweight list with just id and name
        const workflows = searchResult.results.map((w) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          enabled: w.enabled,
        }));

        return response.ok({
          body: { workflows },
        });
      } catch (error) {
        logger.error(`ES|QL WORKFLOW: Failed to fetch workflows list: ${error}`);
        return handleRouteError(response, error);
      }
    }
  );
}

