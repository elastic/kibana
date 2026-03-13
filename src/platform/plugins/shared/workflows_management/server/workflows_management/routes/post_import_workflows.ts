/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Logger } from '@kbn/core/server';
import { WORKFLOW_ROUTE_OPTIONS } from './route_constants';
import { handleRouteError } from './route_error_handlers';
import { WORKFLOW_CREATE_SECURITY } from './route_security';
import type { RouteDependencies } from './types';
import { MAX_IMPORT_PAYLOAD_BYTES, MAX_IMPORT_WORKFLOWS } from '../lib/import_utils';
import { parseIncomingFile } from '../lib/parse_incoming_file';
import { withLicenseCheck } from '../lib/with_license_check';
import { parseWorkflowsArchive, WorkflowArchiveError } from '../lib/zip_archive';

function processZipResult(
  logger: Logger,
  workflows: Array<{ id: string; yaml: string }>,
  errors: string[]
): { failed: boolean; workflows: Array<{ id: string; yaml: string }>; errors: string[] } {
  if (errors.length > 0) {
    logger.warn(`ZIP import had parse errors: ${errors.join('; ')}`);
  }

  if (workflows.length === 0) {
    return { failed: true, workflows: [], errors };
  }

  return { failed: false, workflows, errors };
}

export function registerPostImportWorkflowsRoute({
  router,
  api,
  logger,
  spaces,
}: RouteDependencies) {
  router.post(
    {
      path: '/api/workflows/_import',
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
        query: schema.object({
          overwrite: schema.boolean({ defaultValue: false }),
          generateNewIds: schema.boolean({ defaultValue: false }),
        }),
        body: schema.object({
          file: schema.stream(),
        }),
      },
    },
    withLicenseCheck(async (context, request, response) => {
      try {
        const { overwrite, generateNewIds } = request.query;
        if (overwrite && generateNewIds) {
          return response.badRequest({
            body: { message: 'Cannot use [overwrite] with [generateNewIds]' },
          });
        }

        const spaceId = spaces.getSpaceId(request);

        const parseResult = await parseIncomingFile(request.body.file, response);
        if (!parseResult.ok) {
          return parseResult.error;
        }

        const { format, buffer, fileId } = parseResult.data;

        if (format === 'zip') {
          let archive;
          try {
            archive = parseWorkflowsArchive(buffer, { maxWorkflows: MAX_IMPORT_WORKFLOWS });
          } catch (err) {
            if (err instanceof WorkflowArchiveError) {
              return response.badRequest({ body: { message: err.message } });
            }
            throw err;
          }

          const result = processZipResult(logger, archive.workflows, archive.errors);

          if (result.failed) {
            const detail = result.errors.length > 0 ? `: ${result.errors.join('; ')}` : '';
            return response.badRequest({
              body: {
                message: `The file does not contain any valid workflows${detail}`,
              },
            });
          }

          const workflowPayloads = result.workflows.map((w) => {
            if (generateNewIds) {
              return { yaml: w.yaml };
            }
            return { id: w.id, yaml: w.yaml };
          });

          if (!overwrite && !generateNewIds) {
            const idsToCheck = workflowPayloads
              .map((w) => w.id)
              .filter((id): id is string => id !== undefined);
            if (idsToCheck.length > 0) {
              const conflicts = await api.checkWorkflowConflicts(idsToCheck, spaceId);
              if (conflicts.length > 0) {
                return response.conflict({
                  body: {
                    message: `${conflicts.length} workflow(s) already exist with the same ID(s)`,
                    attributes: {
                      conflicts: conflicts.map((c) => ({ id: c.id, existingName: c.name })),
                    },
                  },
                });
              }
            }
          }

          const bulkResult = await api.bulkCreateWorkflows(workflowPayloads, spaceId, request);
          return response.ok({ body: { ...bulkResult, parseErrors: result.errors } });
        }

        // YAML single-workflow import
        const content = buffer.toString('utf-8');
        if (!content.trim()) {
          return response.badRequest({ body: { message: 'The uploaded file is empty' } });
        }

        const createdWorkflow = await api.createWorkflow(
          { yaml: content, id: fileId },
          spaceId,
          request
        );
        return response.ok({ body: { created: [createdWorkflow], failed: [], parseErrors: [] } });
      } catch (error) {
        return handleRouteError(response, error);
      }
    })
  );
}
