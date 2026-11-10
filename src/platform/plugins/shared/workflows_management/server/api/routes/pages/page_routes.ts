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
import type { WorkflowDetailDto } from '@kbn/workflows';
import {
  isPageTrigger,
  toWorkflowExecutionEngineModel,
  UNTRUSTED_INPUTS_METADATA_KEY,
} from '@kbn/workflows';
import { ExternalResumeError } from '../../external_resume/external_resume_error';
import {
  PAGE_API_PATH,
  PAGE_FORM_PATH,
  PAGE_LINK_API_PATH,
  PAGE_ROTATE_API_PATH,
  PAGE_SECRET_MAX_LENGTH,
  PAGE_WORKFLOW_ID_MAX_LENGTH,
} from '../../pages/constants';
import {
  buildPageUrl,
  getPageSubmitter,
  parsePageSubmission,
  resolvePage,
  toPageDefinition,
} from '../../pages/page_service';
import {
  EXTERNAL_RESUME_SECURITY,
  handleExternalResumeError,
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

const JSON_NO_STORE_HEADERS = { 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' };

/**
 * JSON twin of `handleExternalResumeError` for the page app. A miss never says why, so
 * a caller cannot tell a wrong secret from a disabled workflow.
 */
const pageJsonError = (
  response: KibanaResponseFactory,
  error: unknown,
  logger: RouteDependencies['logger']
) => {
  logger.debug(() => `Page request failed: ${error instanceof Error ? error.message : error}`);
  if (error instanceof ExternalResumeError && error.expose) {
    return response.customError({ statusCode: error.statusCode, body: { message: error.message } });
  }
  if (error instanceof ExternalResumeError) {
    return response.notFound({ body: { message: 'Page not found' } });
  }
  return response.badRequest({ body: { message: 'Unable to submit the page' } });
};

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
  serviceAccountId,
}: {
  basePath: string;
  workflowId: string;
  secret: string;
  enabled: boolean;
  serviceAccountId: string | undefined;
}) => ({ enabled, serviceAccountId, path: buildPageUrl({ basePath, workflowId, secret }) });

/**
 * GET the page app. The secret is checked before Kibana renders anything, so a wrong URL
 * never loads the app. The app then fetches the form from the definition route.
 */
export function registerPageAppRoute(deps: RouteDependencies) {
  const { httpResources, workflowsService, spaces, logger } = deps;

  httpResources.register(
    {
      path: PAGE_FORM_PATH,
      security: {
        authc: {
          enabled: 'optional',
          reason: 'A page is public: the secret in the URL is the credential, not a session.',
        },
        authz: EXTERNAL_RESUME_SECURITY.authz,
      },
      options: { excludeFromOAS: true },
      validate: { params: pageParamsSchema },
    },
    async (context, request, response) => {
      try {
        await resolvePage(workflowsService, {
          ...request.params,
          spaceId: spaces.getSpaceId(request),
        });
        // A visitor without a session gets the anonymous app. The `workflowsPages` plugin
        // loads there and draws the form.
        return request.auth.isAuthenticated
          ? response.renderCoreApp()
          : response.renderAnonymousCoreApp();
      } catch (error) {
        return handleExternalResumeError(response, error, logger, 404);
      }
    }
  );
}

/** GET the form definition of a page: only what the visitor needs to fill the form. */
export function registerPageDefinitionRoute(deps: RouteDependencies) {
  const { router, workflowsService, spaces, logger } = deps;

  router.get(
    {
      path: PAGE_API_PATH,
      security: EXTERNAL_RESUME_SECURITY,
      options: { access: 'internal', excludeFromOAS: true },
      validate: { params: pageParamsSchema },
    },
    withAvailabilityCheck(async (context, request, response) => {
      try {
        const page = await resolvePage(workflowsService, {
          ...request.params,
          spaceId: spaces.getSpaceId(request),
        });
        return response.ok({ body: toPageDefinition(page), headers: JSON_NO_STORE_HEADERS });
      } catch (error) {
        return pageJsonError(response, error, logger);
      }
    })
  );
}

/** POST a page submission as JSON. It validates the input and runs the workflow. */
export function registerPageSubmitRoute(deps: RouteDependencies) {
  const { router, api, workflowsService, spaces, logger, audit } = deps;

  router.post(
    {
      path: PAGE_API_PATH,
      security: EXTERNAL_RESUME_SECURITY,
      options: { access: 'internal', excludeFromOAS: true },
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

        // The visitor has no Kibana identity, so the run uses the workflow's `run_as`
        // service account. Without a binding the page stays offline: no fallback identity.
        const workflowExecutionId = await api.runPageWorkflow(
          toWorkflowExecutionEngineModel(page.workflow),
          spaceId,
          inputs,
          // The visitor is anonymous: its values must stay data, never expressions.
          { submittedVia: 'page', submitter, [UNTRUSTED_INPUTS_METADATA_KEY]: true }
        );

        audit.logWorkflowRun(request, { workflowId, executionId: workflowExecutionId });
        // The visitor gets no execution id: it would name a run they cannot see.
        return response.ok({ body: { submitted: true }, headers: JSON_NO_STORE_HEADERS });
      } catch (error) {
        if (workflowId) {
          audit.logWorkflowRun(request, { workflowId, error });
        }
        return pageJsonError(response, error, logger);
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
              serviceAccountId: workflow.definition?.settings?.run_as,
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
              serviceAccountId: workflow.definition?.settings?.run_as,
            }),
          });
        } catch (error) {
          audit.logWorkflowUpdated(request, { id: workflowId, error });
          return handleRouteError(response, error, { logger });
        }
      })
    );
}
