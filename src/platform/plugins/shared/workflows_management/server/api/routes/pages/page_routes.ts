/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  PAGE_FORM_API_PATH,
  PAGE_LINK_API_PATH,
  PAGE_TOKEN_MAX_LENGTH,
  PAGE_WORKFLOW_ID_MAX_LENGTH,
} from '../../pages/constants';
import { buildPageRunRequest } from '../../pages/page_run_identity';
import {
  buildPageFormUrl,
  getPageSubmitter,
  parsePageSubmission,
  renderPageForm,
  resolvePage,
} from '../../pages/page_service';
import { computePageToken } from '../../pages/page_token';
import {
  EXTERNAL_RESUME_POST_ROUTE_OPTIONS,
  EXTERNAL_RESUME_ROUTE_OPTIONS,
  EXTERNAL_RESUME_SECURITY,
  handleExternalResumeError,
  htmlOk,
  htmlSuccess,
} from '../executions/external_resume_route_helpers';
import type { RouteDependencies } from '../types';
import { API_VERSION, INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const pageParamsSchema = schema.object({
  workflowId: schema.string({
    maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH,
    meta: { description: 'ID of the workflow backing this page.' },
  }),
});

const pageQuerySchema = schema.object({
  token: schema.string({
    maxLength: PAGE_TOKEN_MAX_LENGTH,
    meta: { description: 'The page token authenticating this request.' },
  }),
});

/** GET the hosted form for a workflow page. */
export function registerPageFormRoute(deps: RouteDependencies, signingKey: string) {
  const { router, api, spaces, logger } = deps;

  router.versioned
    .get({
      path: PAGE_FORM_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Get the hosted input form for a workflow page',
      description:
        'Renders the workflow page trigger inputs as an HTML form. Authenticated by a page token, not a Kibana session.',
      options: EXTERNAL_RESUME_ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: { request: { params: pageParamsSchema, query: pageQuerySchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { workflowId } = request.params;
          const { token } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(workflowId, spaceId);
          const page = resolvePage(workflow, { signingKey, spaceId, workflowId, token });

          return htmlOk(
            response,
            renderPageForm({ page, basePath: request.basePath, workflowId, token })
          );
        } catch (error) {
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}

/** POST a page submission, which validates the input and runs the workflow. */
export function registerPageSubmitRoute(
  deps: RouteDependencies,
  signingKey: string,
  runAsApiKey: string
) {
  const { router, api, spaces, logger, audit } = deps;

  router.versioned
    .post({
      path: PAGE_FORM_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Submit a workflow page',
      description:
        'Validates the submitted values against the page trigger input schema and runs the workflow. Returns an HTML confirmation page.',
      options: EXTERNAL_RESUME_POST_ROUTE_OPTIONS,
    })
    .addVersion(
      {
        version: API_VERSION,
        validate: {
          request: {
            params: pageParamsSchema,
            query: pageQuerySchema,
            body: schema.recordOf(schema.string({ maxLength: 256 }), schema.any()),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        const { workflowId } = request.params;
        try {
          const { token } = request.query;
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(workflowId, spaceId);
          const page = resolvePage(workflow, { signingKey, spaceId, workflowId, token });
          const inputs = parsePageSubmission(request.body, page.inputsSchema);
          const submitter = getPageSubmitter(request.headers, request.socket?.remoteAddress);

          // The visitor has no Kibana identity, so the run carries the
          // configured one. `request` stays the visitor's only for audit.
          const runRequest = buildPageRunRequest(runAsApiKey);
          const { workflowExecutionId } = await api.runWorkflowWithAlertPreprocessing({
            workflow: toWorkflowExecutionEngineModel(page.workflow),
            spaceId,
            inputs,
            request: runRequest,
            preprocessingContext: context,
            // No stored run identity yet. The submitter's network details are the
            // only attribution a page run has, so keep them on the execution.
            metadata: { submittedVia: 'page', submitter },
          });

          audit.logWorkflowRun(request, { workflowId, executionId: workflowExecutionId });
          return htmlSuccess(response);
        } catch (error) {
          audit.logWorkflowRun(request, { workflowId, error });
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}

/** Authenticated helper that returns the shareable page URL for an author. */
export function registerPageLinkRoute(deps: RouteDependencies, signingKey: string) {
  const { router, api, spaces } = deps;

  router.versioned
    .get({
      path: PAGE_LINK_API_PATH,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Get the shareable link for a workflow page',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: pageParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        const { workflowId } = request.params;
        const spaceId = spaces.getSpaceId(request);
        const workflow = await api.getWorkflow(workflowId, spaceId);
        if (!workflow?.definition?.triggers?.some((trigger) => trigger.type === 'page')) {
          return response.notFound({
            body: { message: 'Workflow does not define a page trigger.' },
          });
        }

        const token = computePageToken(signingKey, spaceId, workflowId);
        return response.ok({
          body: { url: buildPageFormUrl({ basePath: request.basePath, workflowId, token }), token },
        });
      })
    );
}
