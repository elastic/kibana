/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DownloadableContent } from '@kbn/share-plugin/public';
import { downloadFileAs } from '@kbn/share-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import type { WorkflowApi } from '@kbn/workflows-ui';
import { stringifyWorkflowDefinition } from '@kbn/workflows-yaml';
import { extractReferencedWorkflowIds } from './export/extract_workflow_references';
import { generateWorkflowsZip } from './export/generate_zip_archive';

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
 * download. When `yaml` is provided (typically fetched from the server export
 * API), it is used verbatim so YAML comments in the original source are
 * preserved. Falls back to serializing the parsed definition, which drops
 * comments — kept as a last-resort path for callers that don't have server
 * access. Returns null when neither yaml nor a definition is available.
 */
export const prepareSingleWorkflowExport = (
  workflow: WorkflowListItemDto,
  yaml?: string
): WorkflowExportPayload | null => {
  let content: string;
  if (typeof yaml === 'string' && yaml.length > 0) {
    content = yaml;
  } else if (workflow.definition) {
    content = stringifyWorkflowDefinition(workflow.definition);
  } else {
    return null;
  }
  const filename = `${sanitizeFilename(workflow.name)}.yml`;
  return { filename, content: { content, type: 'text/yaml' } };
};

/**
 * Exports a single workflow as a `.yml` file download. When called without the
 * optional `yaml` argument, comments in the original YAML source are lost
 * because the client-side workflow DTO does not carry the raw YAML — prefer
 * calling `exportWorkflows` (which fetches the YAML from the server) when
 * comment preservation matters.
 */
export const exportSingleWorkflow = (workflow: WorkflowListItemDto, yaml?: string): void => {
  const payload = prepareSingleWorkflowExport(workflow, yaml);
  if (payload) {
    downloadFileAs(payload.filename, payload.content);
  }
};

/**
 * Exports workflows. For a single workflow, downloads as a `.yml` file.
 * For multiple workflows, fetches entries from the server and builds
 * a ZIP archive client-side before triggering the download.
 * Returns the number of exported workflows.
 *
 * Both paths fetch the raw YAML from the server export API so that any
 * comments in the original source are preserved. Re-serializing from the
 * parsed workflow definition would strip them.
 */
export const exportWorkflows = async (
  workflows: WorkflowListItemDto[],
  api: WorkflowApi
): Promise<number> => {
  const exportable = workflows.filter((w): w is WithDefinition => w.definition !== null);
  if (exportable.length === 0) {
    return 0;
  }

  const ids = exportable.map((w) => w.id);
  const { entries, manifest } = await api.exportWorkflows({ ids });

  if (exportable.length === 1) {
    const entry = entries.find((e) => e.id === exportable[0].id) ?? entries[0];
    exportSingleWorkflow(exportable[0], entry?.yaml);
    return 1;
  }

  const blob = await generateWorkflowsZip(entries, manifest);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `workflows_export_${timestamp}.zip`;

  downloadFileAs(filename, blob);
  return exportable.length;
};

/**
 * Finds referenced workflow IDs from a set of workflows that are not
 * already in the export list. Returns the missing IDs.
 */
export const findMissingReferencedIds = (workflowsToExport: WorkflowListItemDto[]): string[] => {
  const exportIds = new Set(workflowsToExport.map((w) => w.id));
  const referencedIds = new Set<string>();

  for (const workflow of workflowsToExport) {
    if (workflow.definition) {
      for (const refId of extractReferencedWorkflowIds(workflow.definition)) {
        if (!exportIds.has(refId)) {
          referencedIds.add(refId);
        }
      }
    }
  }

  return [...referencedIds];
};

const MAX_RESOLVE_DEPTH = 10;

/**
 * Recursively resolves all workflow references, adding transitively
 * referenced workflows to the export list up to a max depth.
 */
export const resolveAllReferences = (
  initialWorkflows: WorkflowListItemDto[],
  allWorkflowsMap: Map<string, WorkflowListItemDto>
): WorkflowListItemDto[] => {
  const result = new Map<string, WorkflowListItemDto>();
  for (const w of initialWorkflows) {
    result.set(w.id, w);
  }

  let frontier = [...initialWorkflows];
  for (let depth = 0; depth < MAX_RESOLVE_DEPTH && frontier.length > 0; depth++) {
    const nextFrontier: WorkflowListItemDto[] = [];
    for (const workflow of frontier) {
      if (workflow.definition) {
        for (const refId of extractReferencedWorkflowIds(workflow.definition)) {
          if (!result.has(refId)) {
            const referenced = allWorkflowsMap.get(refId);
            if (referenced) {
              result.set(refId, referenced);
              nextFrontier.push(referenced);
            }
          }
        }
      }
    }
    frontier = nextFrontier;
  }

  return [...result.values()];
};
