/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { KibanaResponseFactory } from '@kbn/core/server';
import { EXTERNAL_RESUME_API_PATH } from '../../../../common/external_resume/constants';
import { ExternalResumeError } from '../../external_resume/external_resume_error';
import {
  renderExternalResumeErrorPage,
  renderExternalResumeSuccessPage,
} from '../../external_resume/render_external_resume_page';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { executionIdParamSchema } from '../utils/schemas';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const EXTERNAL_RESUME_SECURITY = {
  authc: {
    enabled: false,
    reason: 'External resume uses a short-lived API key token instead of a Kibana session.',
  },
  authz: {
    enabled: false,
    reason:
      'External resume authorizes by matching the API key id to the waiting waitForInput step.',
  },
} as const;

const externalResumeInputSchema = schema.object({
  input: schema.recordOf(schema.string(), schema.any(), {
    defaultValue: {},
    meta: { description: 'Input data to resume the execution with.' },
  }),
});

export function registerExternalResumeExecutionRoute(deps: RouteDependencies) {
  registerExternalResumeGetRoute(deps);
  registerExternalResumePostRoute(deps);
}

function registerExternalResumeGetRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .get({
      path: EXTERNAL_RESUME_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Resume a workflow execution from an external link',
      description:
        'Resume a paused workflow execution using an external resume API key. Returns an HTML confirmation page for browser clients.',
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
            params: executionIdParamSchema,
            query: schema.object(
              {
                apiKey: schema.string({
                  meta: { description: 'External resume API key credential.' },
                }),
              },
              { unknowns: 'allow' }
            ),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const { apiKey, ...input } = request.query as { apiKey: string } & Record<
            string,
            unknown
          >;
          const { resumedBy } = await api.resumeWorkflowExecutionExternally({
            apiKey,
            coerceInput: true,
            executionId,
            input,
            spaceId: spaces.getSpaceId(request),
          });

          audit.logExecutionResumed(request, {
            executionId,
            resumedBy,
          });

          return htmlOk(response, renderExternalResumeSuccessPage());
        } catch (error) {
          audit.logExecutionResumed(request, {
            executionId: request.params.executionId,
            error,
          });
          return handleExternalResumeError(response, error);
        }
      })
    );
}

function registerExternalResumePostRoute(deps: RouteDependencies) {
  const { router, api, spaces, audit } = deps;
  router.versioned
    .post({
      path: EXTERNAL_RESUME_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Resume a workflow execution with external API key',
      description: 'Resume a paused workflow execution using an external resume API key.',
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
            params: executionIdParamSchema,
            query: schema.object({
              apiKey: schema.string({
                meta: { description: 'External resume API key credential.' },
              }),
            }),
            body: externalResumeInputSchema,
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { executionId } = request.params;
          const { apiKey } = request.query;
          const { input } = request.body;
          const { resumedBy } = await api.resumeWorkflowExecutionExternally({
            apiKey,
            executionId,
            input,
            spaceId: spaces.getSpaceId(request),
          });

          audit.logExecutionResumed(request, {
            executionId,
            resumedBy,
          });

          return response.ok({
            body: {
              success: true,
              executionId,
              message: 'Workflow resume scheduled',
            },
          });
        } catch (error) {
          audit.logExecutionResumed(request, {
            executionId: request.params.executionId,
            error,
          });
          return handleExternalResumeError(response, error, { preferJson: true });
        }
      })
    );
}

function htmlOk(response: KibanaResponseFactory, body: string) {
  return response.ok({
    body,
    headers: {
      'content-type': 'text/html; charset=utf-8',
    },
  });
}

function handleExternalResumeError(
  response: KibanaResponseFactory,
  error: unknown,
  options?: { preferJson?: boolean }
) {
  if (error instanceof ExternalResumeError) {
    if (options?.preferJson) {
      return response.custom({
        statusCode: error.statusCode,
        body: { message: error.message },
      });
    }

    return response.custom({
      statusCode: error.statusCode,
      bypassErrorFormat: true,
      body: renderExternalResumeErrorPage(error.message),
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  }

  throw error;
}
