/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RouteValidationFunction, RouteValidationResultFactory } from '@kbn/core/server';
import { z } from '@kbn/zod/v4';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';

const validateWorkflowBodySchema = z.object({
  yaml: z.string(),
});

export function registerPostValidateWorkflowRoute({ router, api, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/internal/workflows/_validate',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        body: buildRouteValidationWithZodV4(validateWorkflowBodySchema),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);
        const result = await api.validateWorkflow(request.body.yaml, spaceId, request);
        return response.ok({ body: result });
      } catch (error) {
        return response.customError({
          statusCode: 500,
          body: {
            message: `Internal server error: ${error}`,
          },
        });
      }
    })
  );
}

function buildRouteValidationWithZodV4<ZodSchema extends z.ZodType>(
  schema: ZodSchema
): RouteValidationFunction<z.output<ZodSchema>> {
  return (inputValue: unknown, validationResult: RouteValidationResultFactory) => {
    const decoded = schema.safeParse(inputValue);
    return decoded.success
      ? validationResult.ok(decoded.data)
      : validationResult.badRequest(decoded.error);
  };
}
