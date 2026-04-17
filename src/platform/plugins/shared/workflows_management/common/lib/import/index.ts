/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import { toSlugIdentifier } from '@kbn/std';
import {
  MAX_WORKFLOW_YAML_LENGTH,
  WORKFLOW_ID_MAX_LENGTH,
  WORKFLOW_ID_MIN_LENGTH,
  WORKFLOW_ID_PATTERN,
} from '@kbn/workflows';
import { z } from '@kbn/zod';

export const MAX_IMPORT_WORKFLOWS = 500;

/** Maximum total decompressed size of all workflow entries in a ZIP archive (50 MB). */
export const MAX_AGGREGATE_IMPORT_BYTES = 50 * 1024 * 1024;

export const WORKFLOW_EXECUTE_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

/** The YAML key under `with:` that holds the target workflow ID. */
export const WORKFLOW_REFERENCE_KEY = 'workflow-id';

/** Returns true when a workflow-id value is a dynamic template (e.g. `{{ inputs.id }}`). */
export const isDynamicWorkflowReference = (value: string): boolean => value.includes('{{');

const UNSAFE_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const RESERVED_ID_PREFIXES = ['system', 'internal', 'system--'];

/** Returns true if the ID is a known prototype-pollution key or other unsupported cases and must never be used. */
export function isUnsafeWorkflowId(id: string): boolean {
  return (
    UNSAFE_IDS.has(id) ||
    id.length === 0 ||
    id.length > WORKFLOW_ID_MAX_LENGTH ||
    id.includes('..') ||
    id.includes('/')
  );
}

export function isReservedWorkflowId(id: string): boolean {
  return RESERVED_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

/** Single Zod schema for workflow ID format — reused in isValidWorkflowId and export schemas. */
const workflowIdSchema = z
  .string()
  .min(WORKFLOW_ID_MIN_LENGTH)
  .max(WORKFLOW_ID_MAX_LENGTH)
  .regex(WORKFLOW_ID_PATTERN);

/**
 * Validates that a workflow ID only contains safe characters and is within
 * a reasonable length. Rejects empty strings, IDs starting with special
 * characters, and known prototype-pollution keys.
 *
 * Delegates format checks to the same Zod schema used in export/create
 * schemas so the two can never diverge.
 */
export function isValidWorkflowId(id: string): boolean {
  return (
    !isUnsafeWorkflowId(id) && !isReservedWorkflowId(id) && workflowIdSchema.safeParse(id).success
  );
}

/**
 * Generates a slug-based workflow ID from a name, or falls back to a UUID-based ID.
 * Shared between client-side preview and server-side creation so both sides
 * produce identical IDs for the same input.
 */
export const generateWorkflowId = (name?: string | null): string => {
  if (name != null) {
    const slug = toSlugIdentifier(String(name));
    if (isValidWorkflowId(slug)) {
      return slug;
    }
  }
  return `workflow-${generateUuid()}`;
};

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

export const MAX_COLLISION_RETRIES = 100;

/**
 * Builds a single suffixed candidate ID from a base ID and a numeric index.
 * Truncates the base when appending the suffix would exceed WORKFLOW_ID_MAX_LENGTH
 * and strips trailing hyphens to prevent invalid double-hyphen sequences.
 *
 * Shared between client-side collision resolution and server-side batch candidate
 * generation so truncation semantics can never diverge.
 */
export const buildSuffixedCandidate = (baseId: string, index: number): string => {
  const suffix = `-${index}`;
  return `${baseId.slice(0, WORKFLOW_ID_MAX_LENGTH - suffix.length).replace(/-+$/, '')}${suffix}`;
};

/**
 * Resolves a non-colliding ID by appending a numeric suffix (-1, -2, ...).
 * Shared between client-side import flow and server-side bulk creation so
 * both sides use identical truncation and retry semantics.
 *
 * Returns the first ID that is not in `conflictIds`, or falls back to `fallbackId`.
 */
export const resolveCollisionId = (
  baseId: string,
  conflictIds: ReadonlySet<string>,
  fallbackId: string
): string => {
  if (!conflictIds.has(baseId)) {
    return baseId;
  }
  for (let i = 1; i <= MAX_COLLISION_RETRIES; i++) {
    const candidate = buildSuffixedCandidate(baseId, i);
    if (!conflictIds.has(candidate)) {
      return candidate;
    }
  }
  return fallbackId;
};

export const WORKFLOW_EXPORT_VERSION = '1';
export { MAX_WORKFLOW_YAML_LENGTH };

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
