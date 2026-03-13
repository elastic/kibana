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
import { WORKFLOW_CREATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { extractWorkflowPreview } from '../../../common/lib/export';
import { MAX_IMPORT_PAYLOAD_BYTES, MAX_IMPORT_WORKFLOWS } from '../lib/import_utils';
import { parseIncomingFile } from '../lib/parse_incoming_file';
import { withLicenseCheck } from '../lib/with_license_check';
import { parseWorkflowsArchive, WorkflowArchiveError } from '../lib/zip_archive';

export function registerPostImportWorkflowsPreflightRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/_import/preflight',
      options: {
        ...WORKFLOW_ROUTE_OPTIONS,
        body: {
          maxBytes: MAX_IMPORT_PAYLOAD_BYTES,
          output: 'stream',
          accepts: 'multipart/form-data',
        },
      },
      security: WORKFLOW_CREATE_SECURITY,
      validate: {
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const spaceId = spaces.getSpaceId(request);

        const parseResult = await parseIncomingFile(request.body.file, response);
        if (!parseResult.ok) {
          return parseResult.error;
        }

        const { format, buffer, fileId } = parseResult.data;

        if (format === 'yaml') {
          const yamlContent = buffer.toString('utf-8');
          const preview = extractWorkflowPreview(fileId, yamlContent);

          const existingMatches = await api.checkWorkflowConflicts([fileId], spaceId);
          const conflicts = existingMatches.map((match) => ({
            id: match.id,
            existingName: match.name,
          }));

          return response.ok({
            body: {
              format: 'yaml',
              totalWorkflows: 1,
              conflicts,
              parseErrors: [],
              workflows: [preview],
            },
          });
        }

        let archive;
        try {
          archive = parseWorkflowsArchive(buffer, { maxWorkflows: MAX_IMPORT_WORKFLOWS });
        } catch (err) {
          if (err instanceof WorkflowArchiveError) {
            return response.badRequest({ body: { message: err.message } });
          }
          throw err;
        }

        if (archive.errors.length > 0) {
          logger.warn(`ZIP preflight had parse errors: ${archive.errors.join('; ')}`);
        }

        const previews = archive.workflows.map((w) => extractWorkflowPreview(w.id, w.yaml));
        const workflowIds = archive.workflows.map((w) => w.id);
        const existingMatches = await api.checkWorkflowConflicts(workflowIds, spaceId);
        const conflicts = existingMatches.map((match) => ({
          id: match.id,
          existingName: match.name,
        }));

        return response.ok({
          body: {
            format: 'zip',
            totalWorkflows: archive.workflows.length,
            conflicts,
            parseErrors: archive.errors,
            workflows: previews,
          },
        });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
