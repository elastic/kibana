/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestHandler } from '@kbn/core/server';
import { RouteDependencies } from '../../..';

interface SpecDefinitionsRouteResponse {
  es: {
    name: string;
    globals: Record<string, any>;
    endpoints: Record<string, any>;
  };
}

export const registerSpecDefinitionsRoute = ({ router, services }: RouteDependencies) => {
  const handler: RequestHandler = async (ctx, request, response) => {
    const specResponse: SpecDefinitionsRouteResponse = {
      es: services.specDefinitionService.asJson(),
    };

    return response.ok({
      body: specResponse,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  router.get({ path: '/api/console/api_server', validate: false }, handler);
  router.post({ path: '/api/console/api_server', validate: false }, handler);
};
