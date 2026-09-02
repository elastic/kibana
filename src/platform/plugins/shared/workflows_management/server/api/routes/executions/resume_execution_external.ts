/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import { schema } from '@kbn/config-schema';
import { EXTERNAL_RESUME_API_PATH } from '@kbn/workflows/server';
import {
  EXTERNAL_RESUME_POST_ROUTE_OPTIONS,
  EXTERNAL_RESUME_ROUTE_OPTIONS,
  EXTERNAL_RESUME_SECURITY,
  handleExternalResumeError,
  htmlSuccess,
} from './external_resume_route_helpers';
import { resolveExternalResumeCredentials } from '../../external_resume/external_resume_service';
import type { RouteDependencies } from '../types';
import { API_VERSION } from '../utils/route_constants';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH = 128;

const externalResumeParamsSchema = schema.object({
  executionId: schema.string({
    maxLength: EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH,
    meta: { description: 'Workflow execution ID' },
  }),
  stepId: schema.string({
    maxLength: EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH,
    meta: { description: 'Workflow step execution ID' },
  }),
});

export function registerExternalResumeExecutionPostRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit, logger } = deps;

  router.versioned
    .post({
      path: EXTERNAL_RESUME_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Submit external input for a paused workflow execution',
      description:
        'Resume a workflow execution that is paused and waiting for external input. Submit input values as a JSON request body, authenticated with a token query parameter. Returns an HTML confirmation page.',
      options: EXTERNAL_RESUME_POST_ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/resume_execution_external_post.yaml'),
        },
        validate: {
          request: {
            params: externalResumeParamsSchema,
            query: schema.object({
              token: schema.string({
                maxLength: 128,
                meta: { description: 'The resume token authenticating this request.' },
              }),
            }),
            body: schema.object({}, { unknowns: 'allow' }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId, stepId } = request.params;
          const { token } = resolveExternalResumeCredentials(request.query);
          const spaceId = spaces.getSpaceId(request);
          const { resumedBy } = await api.resumeWorkflowExecutionExternallyWithInput({
            token,
            executionId,
            stepId,
            spaceId,
            input: request.body as Record<string, unknown>,
          });

          audit.logExecutionResumed(request, {
            executionId,
            resumedBy,
          });

          return htmlSuccess(response);
        } catch (error) {
          audit.logExecutionResumed(request, {
            executionId: request.params.executionId,
            error,
          });
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}

export function registerExternalResumeExecutionGetRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit, logger } = deps;

  router.versioned
    .get({
      path: EXTERNAL_RESUME_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Resume a workflow execution from an external link',
      description:
        'Resume a paused `waitForApproval` step (pauses the workflow and waits for a human to approve/decline before execution continues) or `waitForInput` step (passes the expected input values as query parameters in the URL). Returns an HTML confirmation page.',
      options: EXTERNAL_RESUME_ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/resume_execution_external.yaml'),
        },
        validate: {
          request: {
            params: externalResumeParamsSchema,
            query: schema.object(
              {
                token: schema.string({
                  maxLength: 128,
                  meta: {
                    description:
                      'The token created when the workflow execution was paused. Authenticates the request to resume execution.',
                  },
                }),
                approved: schema.maybe(
                  schema.oneOf(
                    [schema.boolean(), schema.literal('true'), schema.literal('false')],
                    {
                      meta: {
                        description:
                          'Indicates whether a human reviewer approved the paused step. Required for `waitForApproval` when resuming an approval step.',
                      },
                    }
                  )
                ),
              },
              { unknowns: 'allow' }
            ),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId, stepId } = request.params;
          const { token } = resolveExternalResumeCredentials(request.query);
          const { resumedBy } = await api.resumeWorkflowExecutionExternallyViaGet({
            token,
            executionId,
            stepId,
            spaceId: spaces.getSpaceId(request),
            query: request.query as Record<string, unknown>,
          });

          audit.logExecutionResumed(request, {
            executionId,
            resumedBy,
          });

          return htmlSuccess(response);
        } catch (error) {
          audit.logExecutionResumed(request, {
            executionId: request.params.executionId,
            error,
          });
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}
