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

export function registerGetInferenceEndpointsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.get(
    {
      path: '/api/workflows/inference-endpoints',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: false,
    },
    async (context, request, response) => {
      try {
        const coreContext = await context.core;
        const esClient = coreContext.elasticsearch.client.asCurrentUser;

        const { endpoints } = await esClient.inference.get({
          inference_id: '_all',
          task_type: 'rerank',
        });

        const inferenceEndpoints = (endpoints || []).map(
          (endpoint: { inference_id: string; service: string; task_type: string }) => ({
            id: endpoint.inference_id,
            name: endpoint.inference_id,
            service: endpoint.service,
            task_type: endpoint.task_type,
          })
        );

        return response.ok({
          body: {
            endpoints: inferenceEndpoints,
            total: inferenceEndpoints.length,
          },
        });
      } catch (error) {
        logger.error(`Failed to fetch inference endpoints: ${error.message}`);
        return handleRouteError(response, error);
      }
    }
  );
}
