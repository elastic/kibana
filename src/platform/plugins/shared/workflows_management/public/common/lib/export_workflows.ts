/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpStart } from '@kbn/core/public';
import type { DownloadableContent } from '@kbn/share-plugin/public';
import { downloadFileAs } from '@kbn/share-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { stringifyWorkflowDefinition } from '../../../common/lib/yaml';

const FALLBACK_FILENAME = 'workflow_export';

const sanitizeFilename = (name: string): string => {
  const sanitized = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_{2,}/g, '_');
  return sanitized.replace(/^_+|_+$/g, '') || FALLBACK_FILENAME;
};

type WithDefinition = WorkflowListItemDto & {
  definition: NonNullable<WorkflowListItemDto['definition']>;
};

export interface WorkflowExportPayload {
  filename: string;
  content: DownloadableContent;
}

/**
 * Generates the export payload for a single workflow without triggering a
 * download. Returns null when the workflow has no definition.
 */
export const prepareSingleWorkflowExport = (
  workflow: WorkflowListItemDto
): WorkflowExportPayload | null => {
  if (!workflow.definition) {
    return null;
  }
  const yaml = stringifyWorkflowDefinition(workflow.definition);
  const filename = `${sanitizeFilename(workflow.name)}.yml`;
  return { filename, content: { content: yaml, type: 'text/yaml' } };
};

/**
 * Exports a single workflow as a `.yml` file download.
 */
export const exportSingleWorkflow = (workflow: WorkflowListItemDto): void => {
  const payload = prepareSingleWorkflowExport(workflow);
  if (payload) {
    downloadFileAs(payload.filename, payload.content);
  }
};

/**
 * Exports multiple workflows as a ZIP archive via the server-side export API.
 * For a single exportable workflow, falls back to a direct YAML download.
 * Returns the number of exported workflows.
 */
export const exportWorkflows = async (
  workflows: WorkflowListItemDto[],
  http: HttpStart
): Promise<number> => {
  const exportable = workflows.filter((w): w is WithDefinition => w.definition !== null);
  if (exportable.length === 0) {
    return 0;
  }

  if (exportable.length === 1) {
    exportSingleWorkflow(exportable[0]);
    return 1;
  }

  const ids = exportable.map((w) => w.id);
  const blob: Blob = await http.post('/api/workflows/_export', {
    body: JSON.stringify({ ids }),
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `workflows_export_${timestamp}.zip`;

  downloadFileAs(filename, blob);
  return exportable.length;
};
