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
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const O11Y_TEST_CONFIRMATION = 'workflow-o11y-qa-test';

export function registerO11yTestSignalRoutes({
  router,
  logger,
  service,
  spaces,
}: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/o11y_test/500',
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: false,
      },
      withAvailabilityCheck(async (_context, _request, response) => {
        return response.customError({
          statusCode: 500,
          body: {
            message:
              '[WORKFLOWS_O11Y_ALERT_TEST] intentional workflow API 5xx for QA alert validation',
          },
        });
      })
    );

  router.versioned
    .post({
      path: '/internal/workflows/o11y_test/signals',
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: {
          request: {
            body: schema.object({
              confirm: schema.literal(O11Y_TEST_CONFIRMATION),
              emitPluginErrors: schema.boolean({ defaultValue: true }),
              runTaskFailures: schema.number({ min: 0, max: 100, defaultValue: 20 }),
              resumeTaskFailures: schema.number({ min: 0, max: 100, defaultValue: 20 }),
              scheduledTaskFailures: schema.number({ min: 0, max: 100, defaultValue: 20 }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (_context, request, response) => {
        const spaceId = spaces.getSpaceId(request);
        const executionEngine = await service.getWorkflowsExecutionEngine();

        if (request.body.emitPluginErrors) {
          logger.error(
            '[WORKFLOWS_O11Y_ALERT_TEST] workflowsManagement error log emitted for QA alert validation'
          );
          executionEngine.emitO11yTestErrorLog();
        }

        const result = await executionEngine.scheduleO11yTestFailures({
          request,
          spaceId,
          counts: {
            run: request.body.runTaskFailures,
            resume: request.body.resumeTaskFailures,
            scheduled: request.body.scheduledTaskFailures,
          },
        });

        return response.ok({
          body: {
            spaceId,
            scheduled: result.scheduled,
          },
        });
      })
    );
}
