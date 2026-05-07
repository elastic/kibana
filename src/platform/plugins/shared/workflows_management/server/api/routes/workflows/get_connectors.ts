/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

export function registerGetConnectorsRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.versioned
    .get({
      path: '/api/workflows/connectors',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Get available connectors',
      description:
        'Retrieve the Kibana action connectors that can be used in workflow steps, grouped by connector type. Each type includes its configured instances and availability status.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/get_connectors.yaml'),
        },
        validate: false,
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { connectorTypes, totalConnectors } = await api.getAvailableConnectors(
            spaceId,
            request
          );
          return response.ok({
            body: { connectorTypes, totalConnectors },
          });
        } catch (error) {
          logger.error(`Failed to fetch connectors: ${error.message}`);
          return handleRouteError(response, error);
        }
      })
    );
}
