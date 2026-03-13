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
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { withLicenseCheck } from '../lib/with_license_check';
import { preprocessAlertInputs } from '../utils/preprocess_alert_inputs';

export function registerPostTestWorkflowRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/test',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_EXECUTE_SECURITY,
      validate: {
        body: buildRouteValidationWithZodV4(
          z
            .object({
              workflowId: z.string().optional(),
              workflowYaml: z.string().optional(),
              inputs: z.record(z.string(), z.any()),
            })
            .refine((data) => data.workflowId || data.workflowYaml, {
              message: "Either 'workflowId' or 'workflowYaml' or both must be provided",
              path: ['workflowId', 'workflowYaml'],
            })
        ),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        let inputs = request.body.inputs;
        const event = request.body.inputs.event as
          | { triggerType?: string; alertIds?: unknown[] }
          | undefined;

        const hasAlertTrigger =
          event?.triggerType === 'alert' && event?.alertIds && event.alertIds.length > 0;
        if (hasAlertTrigger) {
          inputs = await preprocessAlertInputs(inputs, context, spaceId, logger);
        }

        const workflowExecutionId = await api.testWorkflow({
          workflowId: request.body.workflowId,
          workflowYaml: request.body.workflowYaml,
          inputs,
          spaceId,
          request,
        });

        return response.ok({
          body: {
            workflowExecutionId,
          },
        });
      } catch (error) {
        return handleRouteError(response, error);
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
