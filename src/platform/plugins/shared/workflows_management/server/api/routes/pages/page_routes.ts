/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { isPageTrigger, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  PAGE_FORM_API_PATH,
  PAGE_LINK_API_PATH,
  PAGE_ROTATE_API_PATH,
  PAGE_WORKFLOW_ID_MAX_LENGTH,
} from '../../pages/constants';
import { buildPageRunRequest } from '../../pages/page_run_identity';
import { computePageSecret, PAGE_SECRET_LENGTH } from '../../pages/page_secret';
import {
  buildPageUrl,
  getPageGeneration,
  getPageSubmitter,
  parsePageSubmission,
  renderPageForm,
  resolvePage,
} from '../../pages/page_service';
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
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_UPDATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const workflowIdSchema = schema.string({
  maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH,
  meta: { description: 'ID of the workflow that defines the page.' },
});

const pageParamsSchema = schema.object({
  workflowId: workflowIdSchema,
  secret: schema.string({
    maxLength: PAGE_SECRET_LENGTH,
    meta: { description: 'Secret derived from the workflow. Opens the page.' },
  }),
});

const workflowParamsSchema = schema.object({ workflowId: workflowIdSchema });

const hasPageTrigger = (workflow: WorkflowDetailDto | null): workflow is WorkflowDetailDto =>
  Boolean(workflow?.definition?.triggers.some(isPageTrigger));

/** Response body for the author-facing link and rotate routes. */
const toPageLinkBody = (
  signingKey: string,
  {
    basePath,
    spaceId,
    workflowId,
    enabled,
    generation,
  }: { basePath: string; spaceId: string; workflowId: string; enabled: boolean; generation: number }
) => ({
  enabled,
  path: buildPageUrl({
    basePath,
    workflowId,
    secret: computePageSecret(signingKey, { spaceId, workflowId, generation }),
  }),
});

/** GET the hosted form for a workflow page. The derived URL secret is the credential. */
export function registerPageFormRoute(deps: RouteDependencies, signingKey: string) {
  const { router, workflowsService, spaces, logger } = deps;

  router.versioned
    .get({
      path: PAGE_FORM_API_PATH,
      access: 'public',
      security: EXTERNAL_RESUME_SECURITY,
      summary: 'Get the hosted input form for a workflow page',
      description:
        'Renders the page trigger inputs as an HTML form. Live only while the workflow is enabled.',
      options: EXTERNAL_RESUME_ROUTE_OPTIONS,
    })
    .addVersion(
      { version: API_VERSION, validate: { request: { params: pageParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { workflowId, secret } = request.params;
          const page = await resolvePage(workflowsService.getWorkflow.bind(workflowsService), {
            signingKey,
            spaceId: spaces.getSpaceId(request),
            workflowId,
            secret,
          });
          return htmlOk(response, renderPageForm({ page, basePath: request.basePath, secret }));
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
  const { router, api, workflowsService, spaces, logger, audit } = deps;

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
            body: schema.recordOf(schema.string({ maxLength: 256 }), schema.any()),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        const { workflowId, secret } = request.params;
        let resolved = false;
        try {
          const spaceId = spaces.getSpaceId(request);
          const page = await resolvePage(workflowsService.getWorkflow.bind(workflowsService), {
            signingKey,
            spaceId,
            workflowId,
            secret,
          });
          resolved = true;
          const inputs = parsePageSubmission(request.body, page.inputsSchema);
          const submitter = getPageSubmitter(request.headers, request.socket?.remoteAddress);

          // The visitor has no Kibana identity, so the run carries the configured one.
          // Production uses the workflow's `run_as` service account instead.
          const { workflowExecutionId } = await api.runWorkflowWithAlertPreprocessing({
            workflow: toWorkflowExecutionEngineModel(page.workflow),
            spaceId,
            inputs,
            request: buildPageRunRequest(runAsApiKey),
            preprocessingContext: context,
            metadata: { submittedVia: 'page', submitter },
          });

          audit.logWorkflowRun(request, { workflowId, executionId: workflowExecutionId });
          return htmlSuccess(response);
        } catch (error) {
          // Only audit runs against a real page; a bad URL is not a run attempt.
          if (resolved) {
            audit.logWorkflowRun(request, { workflowId, error });
          }
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}

/** Authenticated helper that returns the page URL to the workflow's author. */
export function registerPageLinkRoute(deps: RouteDependencies, signingKey: string) {
  const { router, api, spaces, logger } = deps;

  router.versioned
    .get({
      path: PAGE_LINK_API_PATH,
      access: 'internal',
      // Edit rights, not read: anyone who has the URL can submit the page.
      security: WORKFLOW_UPDATE_SECURITY,
      summary: 'Get the shareable URL of a workflow page',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: workflowParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { workflowId } = request.params;
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(workflowId, spaceId, request);
          if (!hasPageTrigger(workflow)) {
            return response.notFound({ body: { message: 'Workflow does not define a page.' } });
          }
          return response.ok({
            body: toPageLinkBody(signingKey, {
              basePath: request.basePath,
              spaceId,
              workflowId,
              enabled: workflow.enabled,
              generation: getPageGeneration(workflow),
            }),
          });
        } catch (error) {
          return handleRouteError(response, error, { logger });
        }
      })
    );
}

/** Retires the current page URL by incrementing `pageGeneration`, and returns the new URL. */
export function registerPageRotateRoute(deps: RouteDependencies, signingKey: string) {
  const { router, api, spaces, audit, logger } = deps;

  router.versioned
    .post({
      path: PAGE_ROTATE_API_PATH,
      access: 'internal',
      security: WORKFLOW_UPDATE_SECURITY,
      summary: 'Rotate the URL of a workflow page',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: workflowParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        const { workflowId } = request.params;
        try {
          const spaceId = spaces.getSpaceId(request);
          const workflow = await api.getWorkflow(workflowId, spaceId, request);
          if (!hasPageTrigger(workflow)) {
            return response.notFound({ body: { message: 'Workflow does not define a page.' } });
          }
          const generation = await api.rotatePage(workflowId, spaceId, request);
          audit.logWorkflowUpdated(request, { id: workflowId });
          return response.ok({
            body: toPageLinkBody(signingKey, {
              basePath: request.basePath,
              spaceId,
              workflowId,
              enabled: workflow.enabled,
              generation,
            }),
          });
        } catch (error) {
          audit.logWorkflowUpdated(request, { id: workflowId, error });
          return handleRouteError(response, error, { logger });
        }
      })
    );
}
