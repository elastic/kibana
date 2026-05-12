/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  generateHumanReadableId,
  HUMAN_READABLE_ID_MAX_LENGTH,
  HUMAN_READABLE_ID_MIN_LENGTH,
  HUMAN_READABLE_ID_PATTERN,
  isUnsafeId,
  isValidId,
} from '@kbn/human-readable-id';
import { MAX_WORKFLOW_YAML_LENGTH } from '@kbn/workflows';
import { z } from '@kbn/zod';

export {
  buildSuffixedCandidate,
  resolveCollisionId,
  MAX_COLLISION_RETRIES,
} from '@kbn/human-readable-id';

export const MAX_IMPORT_WORKFLOWS = 500;

/** Maximum total decompressed size of all workflow entries in a ZIP archive (50 MB). */
export const MAX_AGGREGATE_IMPORT_BYTES = 50 * 1024 * 1024;

export const WORKFLOW_EXECUTE_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

/** The YAML key under `with:` that holds the target workflow ID. */
export const WORKFLOW_REFERENCE_KEY = 'workflow-id';

/** Returns true when a workflow-id value is a dynamic template (e.g. `{{ inputs.id }}`). */
export const isDynamicWorkflowReference = (value: string): boolean => value.includes('{{');

const RESERVED_ID_PREFIXES = ['system', 'internal', 'system--'];

export const isUnsafeWorkflowId = isUnsafeId;

export const isReservedWorkflowId = (id: string): boolean =>
  RESERVED_ID_PREFIXES.some((prefix) => id.startsWith(prefix));

export const isValidWorkflowId = (id: string): boolean =>
  isValidId(id) && !isReservedWorkflowId(id);

export const generateWorkflowId = (name?: string | null): string =>
  generateHumanReadableId(name, { fallbackPrefix: 'workflow' });

// ZIP magic bytes: PK (0x50 0x4B)
const ZIP_MAGIC_BYTE_0 = 0x50;
const ZIP_MAGIC_BYTE_1 = 0x4b;

/**
 * Detects whether a byte sequence is a ZIP archive or YAML text by checking
 * the first two bytes for the ZIP magic number (`PK`).
 * Accepts both `Buffer` (Node) and `Uint8Array` (browser) inputs.
 */
export function detectFileFormat(bytes: Uint8Array): 'zip' | 'yaml' {
  if (bytes.length >= 2 && bytes[0] === ZIP_MAGIC_BYTE_0 && bytes[1] === ZIP_MAGIC_BYTE_1) {
    return 'zip';
  }
  return 'yaml';
}

export const WORKFLOW_EXPORT_VERSION = '1';
export { MAX_WORKFLOW_YAML_LENGTH };

/** Zod schema for workflow IDs — reused in WorkflowExportEntrySchema and isValidWorkflowId. */
const workflowIdSchema = z
  .string()
  .min(HUMAN_READABLE_ID_MIN_LENGTH)
  .max(HUMAN_READABLE_ID_MAX_LENGTH)
  .regex(HUMAN_READABLE_ID_PATTERN);

export const WorkflowExportEntrySchema = z.object({
  id: workflowIdSchema,
  yaml: z.string().max(MAX_WORKFLOW_YAML_LENGTH),
});

const SUPPORTED_EXPORT_VERSIONS = [WORKFLOW_EXPORT_VERSION] as const;

export const WorkflowExportManifestSchema = z
  .object({
    exportedCount: z.number(),
    exportedAt: z.string(),
    version: z.enum(SUPPORTED_EXPORT_VERSIONS),
  })
  .strict();

export type WorkflowExportEntry = z.infer<typeof WorkflowExportEntrySchema>;
export type WorkflowExportManifest = z.infer<typeof WorkflowExportManifestSchema>;

export interface ExportWorkflowsResponse {
  entries: WorkflowExportEntry[];
  manifest: WorkflowExportManifest;
}
