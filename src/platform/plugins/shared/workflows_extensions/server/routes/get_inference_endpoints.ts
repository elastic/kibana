/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';

export function registerGetInferenceEndpointsRoute(router: IRouter) {
  router.get(
    {
      path: '/internal/workflowsExtensions/inference_endpoints',
      security: {
        authz: {
          enabled: false,
          reason: 'This route delegates authorization to the scoped ES client',
        },
      },
      validate: {},
    },
    async (context, request, response) => {
      const coreContext = await context.core;
      const esClient = coreContext.elasticsearch.client.asCurrentUser;

      const { endpoints } = await esClient.inference.get({
        inference_id: '_all',
      });

      return response.ok({
        body: {
          inference_endpoints: endpoints,
        },
      });
    }
  );
}
