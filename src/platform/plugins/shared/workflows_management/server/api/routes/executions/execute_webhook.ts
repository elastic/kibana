/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { idParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const PUBLIC_WEBHOOK_SECURITY = {
  authc: {
    enabled: false as const,
    reason:
      'Webhook trigger execution is intentionally public; credentials are checked in route logic.',
  },
  authz: {
    enabled: false as const,
    reason:
      'Webhook trigger execution is intentionally public; workflow-bound credentials are checked in route logic.',
  },
};

const toRecord = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

export function registerExecuteWebhookRoutes(deps: RouteDependencies) {
  const { router, api, spaces } = deps;

  const createHandler = (source: 'query' | 'body') =>
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const { id } = request.params;
        const spaceId = spaces.getSpaceId(request);
        const inputs = source === 'query' ? toRecord(request.query) : toRecord(request.body);
        const { apiKey, ...inputsWithoutAuth } = inputs;
        const result = await api.enqueueWebhookInvocation({
          workflowId: id,
          spaceId,
          inputs: source === 'query' ? inputsWithoutAuth : inputs,
          request,
        });
        return response.ok({ body: result });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes('not authorized') || message.includes('credentials')) {
          return response.customError({ statusCode: 401, body: { message } });
        }
        return handleRouteError(response, error as Error);
      }
    });

  router.versioned
    .get({
      path: '/api/workflows/workflow/{id}/execute',
      access: 'public',
      security: PUBLIC_WEBHOOK_SECURITY,
      summary: 'Execute a workflow webhook trigger',
      description: 'Public endpoint that invokes a workflow with a webhook trigger using query parameters as inputs.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: idParamSchema,
            query: schema.recordOf(schema.string(), schema.any()),
          },
        },
      },
      createHandler('query')
    );

  router.versioned
    .post({
      path: '/api/workflows/workflow/{id}/execute',
      access: 'public',
      security: PUBLIC_WEBHOOK_SECURITY,
      xsrfRequired: false,
      summary: 'Execute a workflow webhook trigger',
      description: 'Public endpoint that invokes a workflow with a webhook trigger using the raw JSON body as inputs.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: idParamSchema,
            body: schema.maybe(schema.recordOf(schema.string(), schema.any())),
          },
        },
      },
      createHandler('body')
    );
}
