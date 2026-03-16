/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WORKFLOW_ID_PATTERN } from '@kbn/workflows';

export const MAX_IMPORT_WORKFLOWS = 500;

/** Maximum total decompressed size of all workflow entries in a ZIP archive (50 MB). */
export const MAX_AGGREGATE_IMPORT_BYTES = 50 * 1024 * 1024;

export const WORKFLOW_EXECUTE_TYPES = new Set(['workflow.execute', 'workflow.executeAsync']);

/** The YAML key under `with:` that holds the target workflow ID. */
export const WORKFLOW_REFERENCE_KEY = 'workflow-id';

/** Returns true when a workflow-id value is a dynamic template (e.g. `{{ inputs.id }}`). */
export const isDynamicWorkflowReference = (value: string): boolean => value.includes('{{');

const UNSAFE_IDS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Validates that a workflow ID only contains safe characters and is within
 * a reasonable length. Rejects empty strings, IDs starting with special
 * characters, and known prototype-pollution keys.
 */
export function isValidWorkflowId(id: string): boolean {
  return !UNSAFE_IDS.has(id) && WORKFLOW_ID_PATTERN.test(id);
}

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
