/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_READ_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import type { WorkflowExportEntry } from '../../../common/lib/import';
import { stringifyWorkflowDefinition } from '../../../common/lib/yaml';
import { withLicenseCheck } from '../lib/with_license_check';
import { generateWorkflowsArchive } from '../lib/zip_archive';

export function registerPostExportWorkflowsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/_export',
      options: WORKFLOW_ROUTE_OPTIONS,
      security: WORKFLOW_READ_SECURITY,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string({ maxLength: 255 }), { minSize: 1, maxSize: 500 }),
        }),
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
            body: {
              message: 'None of the requested workflows were found',
            },
          });
        }

        const foundIds = new Set(entries.map((e) => e.id));
        const missingIds = ids.filter((id) => !foundIds.has(id));
        if (missingIds.length > 0) {
          logger.warn(
            `Export skipped ${missingIds.length} missing workflow(s): ${missingIds.join(', ')}`
          );
        }

        // Filename is derived from a server-generated timestamp only (no user input)
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
