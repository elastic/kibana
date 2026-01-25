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
import type { RouteDependencies } from './types';
import { typesRegistry } from './types_registry_schema';

/**
 * Registers a route to serve the workflow types registry JSON Schema.
 * This allows workflows to reference common type definitions via $ref.
 *
 * Example usage in workflow YAML:
 * ```yaml
 * inputs:
 *   properties:
 *     user:
 *       $ref: "http://localhost:5601/hdz/api/workflows/types-registry.json#/definitions/User"
 * ```
 * Note: Replace /hdz with your actual base path if different
 */
export function registerGetTypesRegistryRoute({ router, logger }: RouteDependencies) {
  logger.debug('Registering types registry route');
  router.get(
    {
      path: '/api/workflows/types-registry.json',
      options: {
        ...WORKFLOW_ROUTE_OPTIONS,
        tags: ['api', 'access:workflows-read'],
        access: 'public', // Public route for schema resolution
        httpResource: true, // Serves static JSON Schema resource
        excludeFromRateLimiter: true,
      },
      security: {
        authz: {
          enabled: false,
          reason: 'Public read-only schema registry - no authorization required',
        },
        authc: {
          enabled: false,
          reason: 'Public read-only schema registry for JSON Schema reference resolution',
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        logger.debug('Serving types registry');
        // Set proper content type for JSON Schema
        return response.ok({
          body: typesRegistry,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Access-Control-Allow-Origin': '*', // Allow CORS for ref resolution
          },
        });
      } catch (error) {
        logger.error('Error serving types registry:', error);
        return handleRouteError(response, error);
      }
    }
  );
}
