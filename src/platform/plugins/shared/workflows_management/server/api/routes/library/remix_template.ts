/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { MAX_WORKFLOW_YAML_LENGTH, WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';

import { mapLibraryError } from './error_mapper';
import { type LibraryService, resolveTemplateOrigin } from '../../../library';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const paramsSchema = schema.object({
  slug: schema.string({ maxLength: 256 }),
});

const bodySchema = schema.object({
  /** Workflow YAML saved from the editor after "Remix with AI" seeded it with the rendered template. */
  yaml: schema.string({ maxLength: MAX_WORKFLOW_YAML_LENGTH }),
  /** Version of the template the remix started from. */
  version: schema.maybe(schema.string({ maxLength: 256 })),
});

export function registerRemixTemplateRoute(
  { router, api, spaces, audit, logger }: RouteDependencies,
  libraryService: LibraryService
) {
  router.versioned
    .post({
      path: '/internal/workflows/library/templates/{slug}/remix',
      access: 'internal',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Save a workflow remixed from a Workflow Template library template',
      description:
        'Creates a workflow from YAML edited after "Remix with AI" and records the template it started from.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { params: paramsSchema, body: bodySchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { uiSettings } = await context.core;
          const libraryEnabled = await uiSettings.globalClient.get<boolean>(
            WORKFLOWS_LIBRARY_ENABLED_SETTING_ID
          );
          // Saving the user's workflow must not depend on the library: with
          // the library off, it is created without a template origin.
          const templateOrigin = libraryEnabled
            ? await resolveTemplateOrigin({
                libraryService,
                logger,
                slug: request.params.slug,
                version: request.body.version,
                origin: 'remix',
              })
            : undefined;

          // Same create path as POST /api/workflows/workflow, so schema
          // validation, space scoping, and authz apply identically.
          const spaceId = spaces.getSpaceId(request);
          let createdWorkflow;
          try {
            createdWorkflow = await api.createWorkflow(
              { yaml: request.body.yaml },
              spaceId,
              request,
              {
                templateOrigin,
              }
            );
          } catch (error) {
            audit.logWorkflowCreateFailed(request, error);
            throw error;
          }
          audit.logWorkflowCreated(request, { id: createdWorkflow.id });

          return response.ok({ body: createdWorkflow });
        } catch (error) {
          return mapLibraryError(response, error);
        }
      })
    );
}
