/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RequestHandler } from '@kbn/core/server';
import type { RouteDependencies } from '../../..';
import { buildKibanaApiSpec, type KibanaApiSpec } from '../../../../lib';

interface SpecDefinitionsRouteResponse {
  es: {
    name: string;
    globals: Record<string, any>;
    endpoints: Record<string, any>;
  };
  kibana: KibanaApiSpec;
}

export const registerSpecDefinitionsRoute = ({
  router,
  services,
  getRegisteredRoutes,
  isDevMode,
}: RouteDependencies) => {
  const handler: RequestHandler = async (ctx, request, response) => {
    const specResponse: SpecDefinitionsRouteResponse = {
      es: services.specDefinitionService.asJson(),
      // In development, also surface internal Kibana routes so Dev Tools users
      // get autocomplete for the `/internal/...` endpoints they commonly call.
      // `includeQueryParameters` extracts each route's query params so Console can
      // suggest them (e.g. `?perPage=`) after the URL path.
      kibana: buildKibanaApiSpec(getRegisteredRoutes({ includeQueryParameters: true }), {
        includeInternal: isDevMode,
      }),
    };

    return response.ok({
      body: specResponse,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  router.get(
    {
      path: '/api/console/api_server',
      security: {
        authz: {
          enabled: false,
          reason: 'Low effort request for config info',
        },
      },
      validate: false,
    },
    handler
  );
};
