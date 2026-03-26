/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

// Using '::' as separator - unlikely to appear in normal IDs (UUIDs use '-')
export const SPACE_ID_SEPARATOR = '::';
export const SYSTEM_SPACE_PROPERTY = 'kibana.space_ids';

/** Check if an ID contains the space separator. */
export function containsSpaceSeparator(id: string): boolean {
  return id.includes(SPACE_ID_SEPARATOR);
}

/**
 * Validate that a user-provided ID does NOT contain the space separator.
 * This applies to both space-aware and space-agnostic modes to prevent confusion
 * and potential injection attacks. The separator is reserved for system use.
 */
export function throwOnIdWithSeparator(id: string): void {
  if (containsSpaceSeparator(id)) {
    throw new Error(
      `Invalid document ID: IDs cannot contain '${SPACE_ID_SEPARATOR}'. ` +
        `This separator is reserved for system use.`
    );
  }
}

/** Generate a space-prefixed ID. Only called when space is defined. */
export function generateSpacePrefixedId(space: string, id?: string): string {
  const docId = id ?? uuidv4();
  return `${space}${SPACE_ID_SEPARATOR}${docId}`;
}

/** Add kibana.space_ids property to document. Only called when space is defined. */
export function decorateDocumentWithSpace<T>(
  doc: T,
  space: string
): T & { kibana: { space_ids: string[] } } {
  return { ...doc, kibana: { space_ids: [space] } };
}

/** Build ES term filter for a specific space. */
export function buildSpaceFilter(space: string) {
  return { term: { [SYSTEM_SPACE_PROPERTY]: space } };
}

/** Build ES filter to exclude space-bound documents (for space-agnostic searches). */
export function buildSpaceAgnosticFilter() {
  return { bool: { must_not: { exists: { field: SYSTEM_SPACE_PROPERTY } } } };
}
