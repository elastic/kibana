/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { isPageTrigger, toWorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  PAGE_FORM_API_PATH,
  PAGE_ID_PARAM_MAX_LENGTH,
  PAGE_LINK_API_PATH,
  PAGE_WORKFLOW_ID_MAX_LENGTH,
} from '../../pages/constants';
import { PAGE_ID_KEY } from '../../pages/page_ids';
import { buildPageRunRequest } from '../../pages/page_run_identity';
import {
  buildPageUrl,
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
import { WORKFLOW_EXECUTE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const pageParamsSchema = schema.object({
  pageId: schema.string({
    maxLength: PAGE_ID_PARAM_MAX_LENGTH,
    meta: { description: 'The `page-id` of the workflow page trigger.' },
  }),
});

const workflowParamsSchema = schema.object({
  workflowId: schema.string({
    maxLength: PAGE_WORKFLOW_ID_MAX_LENGTH,
    meta: { description: 'ID of the workflow that defines the page.' },
  }),
});

/** GET the hosted form for a workflow page. The unguessable `page-id` is the credential. */
export function registerPageFormRoute(deps: RouteDependencies) {
  const { router, api, spaces, logger } = deps;

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
          const { pageId } = request.params;
          const page = await resolvePage(api.getWorkflowsSubscribedToTrigger.bind(api), {
            pageId,
            spaceId: spaces.getSpaceId(request),
          });
          return htmlOk(response, renderPageForm({ page, basePath: request.basePath, pageId }));
        } catch (error) {
          return handleExternalResumeError(response, error, logger);
        }
      })
    );
}

/** POST a page submission, which validates the input and runs the workflow. */
export function registerPageSubmitRoute(deps: RouteDependencies, runAsApiKey: string) {
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
            body: schema.recordOf(schema.string({ maxLength: 256 }), schema.any()),
          },
        },
      },
      withAvailabilityCheck(async (context, request, response) => {
        const { pageId } = request.params;
        let workflowId: string | undefined;
        try {
          const spaceId = spaces.getSpaceId(request);
          const page = await resolvePage(api.getWorkflowsSubscribedToTrigger.bind(api), {
            pageId,
            spaceId,
          });
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
            metadata: { submittedVia: 'page', pageId, submitter },
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

/** Authenticated helper that lists the public URLs of a workflow's pages. */
export function registerPageLinkRoute(deps: RouteDependencies) {
  const { router, api, spaces } = deps;

  router.versioned
    .get({
      path: PAGE_LINK_API_PATH,
      access: 'internal',
      security: WORKFLOW_EXECUTE_SECURITY,
      summary: 'Get the shareable links for a workflow page',
    })
    .addVersion(
      { version: INTERNAL_API_VERSION, validate: { request: { params: workflowParamsSchema } } },
      withAvailabilityCheck(async (context, request, response) => {
        const workflow = await api.getWorkflow(
          request.params.workflowId,
          spaces.getSpaceId(request),
          request
        );
        const pageIds = (workflow?.definition?.triggers ?? [])
          .filter(isPageTrigger)
          .map((trigger) => trigger[PAGE_ID_KEY])
          .filter((id): id is string => typeof id === 'string');
        if (!workflow || pageIds.length === 0) {
          return response.notFound({ body: { message: 'Workflow does not define a page.' } });
        }

        return response.ok({
          body: {
            enabled: workflow.enabled,
            pages: pageIds.map((pageId) => ({
              pageId,
              url: buildPageUrl({ basePath: request.basePath, pageId }),
            })),
          },
        });
      })
    );
}
