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
import { EXTERNAL_RESUME_FORM_API_PATH } from '@kbn/workflows/server';
import {
  EXTERNAL_RESUME_ROUTE_OPTIONS,
  EXTERNAL_RESUME_SECURITY,
  handleExternalResumeError,
  htmlOk,
} from './external_resume_route_helpers';
import type { RouteDependencies } from '../types';
import { API_VERSION } from '../utils/route_constants';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH = 128;

const externalResumeFormParamsSchema = schema.object({
  executionId: schema.string({
    maxLength: EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH,
    meta: { description: 'Workflow execution ID' },
  }),
  stepId: schema.string({
    maxLength: EXTERNAL_RESUME_ID_PARAM_MAX_LENGTH,
    meta: { description: 'Workflow step execution ID' },
  }),
});

export function registerExternalResumeFormRoute(deps: RouteDependencies) {
  const { router, api, spaces, logger } = deps;

  router.versioned
    .get({
      path: EXTERNAL_RESUME_FORM_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Get the external input form for a paused workflow execution',
      description:
        'Returns an HTML form for submitting external input to a paused waitForInput step. Does not resume the execution.',
      options: EXTERNAL_RESUME_ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () =>
            path.join(__dirname, '../examples/resume_execution_external_form.yaml'),
        },
        validate: {
          request: {
            params: externalResumeFormParamsSchema,
            query: schema.object({
              token: schema.string({
                maxLength: 128,
                meta: { description: 'The resume token authenticating this request.' },
              }),
            }),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId, stepId } = request.params;
          const { token } = request.query;
          const body = await api.getExternalResumeFormPage({
            token,
            executionId,
            stepId,
            spaceId: spaces.getSpaceId(request),
            basePath: request.basePath,
          });

          return htmlOk(response, body);
        } catch (error) {
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}
