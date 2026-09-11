/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOWS_LIBRARY_ENABLED_SETTING_ID } from '@kbn/workflows';
import { parseTemplateYaml, renderInstall } from '@kbn/workflows-library';

import { mapLibraryError } from './error_mapper';
import { LibraryDisabledError } from '../../../library';
import type { RouteDependencies } from '../types';
import { INTERNAL_API_VERSION } from '../utils/route_constants';
import { WORKFLOW_CREATE_SECURITY } from '../utils/route_security';
import { withAvailabilityCheck } from '../utils/with_availability_check';

const bodySchema = schema.object({
  /**
   * The raw template YAML (with its `template-metadata` block) supplied by the
   * client — e.g. a file uploaded through the "Install template from file" flow.
   * Parsed and validated server-side; never fetched from the catalog.
   */
  yaml: schema.string({ maxLength: 512 * 1024 }),
  /**
   * Install-form values keyed by `install.form` field name. Value types are
   * validated against the template's declared form by `renderInstall`
   * (field-level 400 on mismatch), not by the transport schema.
   */
  values: schema.recordOf(schema.string({ maxLength: 1024 }), schema.any(), {
    defaultValue: {},
  }),
});

export function registerInstallFromYamlRoute({ router, api, spaces, audit }: RouteDependencies) {
  router.versioned
    .post({
      path: '/internal/workflows/library/templates/install',
      access: 'internal',
      security: WORKFLOW_CREATE_SECURITY,
      summary: 'Install a Workflow Template Library template from raw YAML',
      description:
        'Parses a client-supplied template YAML, renders it with the submitted install-form values, and creates a workflow from the result.',
    })
    .addVersion(
      {
        version: INTERNAL_API_VERSION,
        validate: { request: { body: bodySchema } },
      },
      withAvailabilityCheck(async (context, request, response) => {
        try {
          const { uiSettings } = await context.core;
          const enabled = await uiSettings.globalClient.get<boolean>(
            WORKFLOWS_LIBRARY_ENABLED_SETTING_ID
          );
          if (!enabled) throw new LibraryDisabledError();

          const template = parseTemplateYaml(request.body.yaml, { lenient: true });
          const { yaml } = renderInstall({ template, values: request.body.values });

          // The rendered YAML is indistinguishable from a hand-authored one:
          // reuse the same create path as POST /api/workflows/workflow so
          // schema validation, space scoping, and authz apply identically.
          const spaceId = spaces.getSpaceId(request);
          let createdWorkflow;
          try {
            createdWorkflow = await api.createWorkflow({ yaml }, spaceId, request);
          } catch (error) {
            audit.logWorkflowCreateFailed(request, error);
            throw error;
          }
          audit.logWorkflowCreated(request, { id: createdWorkflow.id });

          return response.ok({ body: { workflowId: createdWorkflow.id } });
        } catch (error) {
          return mapLibraryError(response, error);
        }
      })
    );
}
