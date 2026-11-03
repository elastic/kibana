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
import {
  isPageTrigger,
  toWorkflowExecutionEngineModel,
  UNTRUSTED_INPUTS_METADATA_KEY,
} from '@kbn/workflows';
import {
  PAGE_FORM_PATH,
  PAGE_LINK_API_PATH,
  PAGE_ROTATE_API_PATH,
  PAGE_SECRET_MAX_LENGTH,
  PAGE_WORKFLOW_ID_MAX_LENGTH,
} from '../../pages/constants';
import { buildPageRunRequest } from '../../pages/page_run_identity';
import {
  buildPageUrl,
  getPageSubmitter,
  parsePageSubmission,
  renderPageForm,
  resolvePage,
} from '../../pages/page_service';
import {
  EXTERNAL_RESUME_SECURITY,
  handleExternalResumeError,
  htmlOk,
  htmlSuccess,
} from '../executions/external_resume_route_helpers';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_EXECUTE_SECURITY, WORKFLOW_UPDATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const pageParamsSchema = schema.object({
  workflowId: schema.string({ maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH }),
  secret: schema.string({ maxLength: PAGE_SECRET_MAX_LENGTH }),
});

/** The page is a server-rendered HTML form, not an API, so it stays out of the OpenAPI spec. */
const PAGE_ROUTE_OPTIONS = { access: 'public', excludeFromOAS: true } as const;

const workflowParamsSchema = schema.object({
  workflowId: schema.string({
    maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH,
    meta: { description: 'ID of the workflow that defines the page.' },
  }),
});

const hasPageTrigger = (workflow: WorkflowDetailDto | null): workflow is WorkflowDetailDto =>
  Boolean(workflow?.definition?.triggers.some(isPageTrigger));

/** Response body for the author-facing link and rotate routes. */
const toPageLinkBody = ({
  basePath,
  workflowId,
  secret,
  enabled,
}: {
  basePath: string;
  workflowId: string;
  secret: string;
  enabled: boolean;
}) => ({ enabled, path: buildPageUrl({ basePath, workflowId, secret }) });

/** GET the hosted form for a workflow page. The secret in the URL is the credential. */
export function registerPageFormRoute(deps: RouteDependencies) {
  const { router, workflowsService, spaces, logger } = deps;

  router.get(
    {
      path: PAGE_FORM_PATH,
      security: EXTERNAL_RESUME_SECURITY,
      options: PAGE_ROUTE_OPTIONS,
      validate: { params: pageParamsSchema },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const page = await resolvePage(workflowsService, {
          ...request.params,
          spaceId: spaces.getSpaceId(request),
        });
        return htmlOk(response, renderPageForm({ page, basePath: request.basePath }));
      } catch (error) {
        return handleExternalResumeError(response, error, logger);
      }
    })
  );
}

/** POST a page submission, which validates the input and runs the workflow. */
export function registerPageSubmitRoute(deps: RouteDependencies, runAsApiKey: string) {
  const { router, api, workflowsService, spaces, logger, audit } = deps;

  router.post(
    {
      path: PAGE_FORM_PATH,
      security: EXTERNAL_RESUME_SECURITY,
      options: { ...PAGE_ROUTE_OPTIONS, xsrfRequired: false },
      validate: {
        params: pageParamsSchema,
        body: schema.recordOf(schema.string({ maxLength: 256 }), schema.any()),
      },
    },
    withAvailabilityCheck(async (context, request, response) => {
      // Set only once the URL resolves to a real page; a bad URL is not a run attempt.
      let workflowId: string | undefined;
      try {
        const spaceId = spaces.getSpaceId(request);
        const page = await resolvePage(workflowsService, { ...request.params, spaceId });
        workflowId = page.workflow.id;
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
          // The visitor is anonymous: its values must stay data, never expressions.
          metadata: {
            submittedVia: 'page',
            submitter,
            [UNTRUSTED_INPUTS_METADATA_KEY]: true,
          },
        });

        audit.logWorkflowRun(request, { workflowId, executionId: workflowExecutionId });
        return htmlSuccess(response);
      } catch (error) {
        if (workflowId) {
          audit.logWorkflowRun(request, { workflowId, error });
        }
        return handleExternalResumeError(response, error, logger);
      }
    })
  );
}

/** Authenticated helper that returns the page URL to the workflow's author. */
export function registerPageLinkRoute(deps: RouteDependencies) {
  const { router, api, spaces, logger } = deps;

  router.versioned
    .get({
      path: PAGE_LINK_API_PATH,
      access: 'internal',
      // The URL runs the workflow without a login, so only users who can run it get the URL.
      security: WORKFLOW_EXECUTE_SECURITY,
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
          const secret = await api.getPageSecret(workflowId, spaceId, request);
          return response.ok({
            body: toPageLinkBody({
              basePath: request.basePath,
              workflowId,
              secret,
              enabled: workflow.enabled,
            }),
          });
        } catch (error) {
          return handleRouteError(response, error, { logger });
        }
      })
    );
}

/** Retires the current page URL by replacing its secret, and returns the new URL. */
export function registerPageRotateRoute(deps: RouteDependencies) {
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
          const secret = await api.rotatePage(workflowId, spaceId, request);
          audit.logWorkflowUpdated(request, { id: workflowId });
          return response.ok({
            body: toPageLinkBody({
              basePath: request.basePath,
              workflowId,
              secret,
              enabled: workflow.enabled,
            }),
          });
        } catch (error) {
          audit.logWorkflowUpdated(request, { id: workflowId, error });
          return handleRouteError(response, error, { logger });
        }
      })
    );
}
