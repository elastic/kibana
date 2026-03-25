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
import type { WorkflowExportEntry } from '../../../../common/lib/import';
import { stringifyWorkflowDefinition } from '../../../../common/lib/yaml';
import { generateWorkflowsArchive } from '../../lib/zip_archive';
import type { RouteDependencies } from '../types';
import { API_VERSION, AVAILABILITY, OAS_TAG } from '../utils/route_constants';
import { handleRouteError } from '../utils/route_error_handlers';
import { WORKFLOW_READ_SECURITY } from '../utils/route_security';
import { withLicenseCheck } from '../utils/with_license_check';

export function registerExportWorkflowsRoute({ router, api, logger, spaces }: RouteDependencies) {
  router.versioned
    .post({
      path: '/api/workflows/export',
      access: 'public',
      security: WORKFLOW_READ_SECURITY,
      summary: 'Export workflows',
      description: 'Export one or more workflows YAML files as a ZIP archive.',
      options: {
        tags: [OAS_TAG],
        availability: AVAILABILITY,
      },
    })
    .addVersion(
      {
        version: API_VERSION,
        options: {
          oasOperationObject: () => path.join(__dirname, '../examples/export_workflows.yaml'),
        },
        validate: {
          request: {
            body: schema.object({
              ids: schema.arrayOf(
                schema.string({ maxLength: 255, meta: { description: 'Workflow ID to export.' } }),
                {
                  minSize: 1,
                  maxSize: 500,
                  meta: { description: 'Array of workflow IDs to export.' },
                }
              ),
            }),
          },
        },
      },
      withLicenseCheck(async (context, request, response) => {
        try {
          const spaceId = spaces.getSpaceId(request);
          const { ids } = request.body;

          const workflows = await api.getWorkflowsByIds(ids, spaceId);

          const entries: WorkflowExportEntry[] = workflows.map((workflow) => {
            const yaml =
              typeof workflow.definition === 'object' && workflow.definition !== null
                ? stringifyWorkflowDefinition(workflow.definition)
                : workflow.yaml;
            return { id: workflow.id, yaml };
          });

          if (entries.length === 0) {
            return response.notFound({
              body: { message: 'None of the requested workflows were found' },
            });
          }

          const foundIds = new Set(entries.map((e) => e.id));
          const missingIds = ids.filter((id) => !foundIds.has(id));
          if (missingIds.length > 0) {
            logger.warn(
              `Export skipped ${missingIds.length} missing workflow(s): ${missingIds.join(', ')}`
            );
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `workflows_export_${timestamp}.zip`;
          const zipBuffer = await generateWorkflowsArchive(entries);

          return response.ok({
            body: zipBuffer,
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${filename}"`,
            },
          });
        } catch (error) {
          return handleRouteError(response, error);
        }
      })
    );
}
