/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const SPACE_ID_SEPARATOR = '::';
export declare const SYSTEM_SPACE_PROPERTY = 'kibana.space_ids';
/** Check if an ID contains the space separator. */
export declare function containsSpaceSeparator(id: string): boolean;
/**
 * Validate that a user-provided ID does NOT contain the space separator.
 * This applies to both space-aware and space-agnostic modes to prevent confusion
 * and potential injection attacks. The separator is reserved for system use.
 */
export declare function throwOnIdWithSeparator(id: string): void;
/** Generate a space-prefixed ID. Only called when space is defined. */
export declare function generateSpacePrefixedId(space: string, id?: string): string;
/** Add kibana.space_ids property to document. Only called when space is defined. */
export declare function decorateDocumentWithSpace<T>(
  doc: T,
  space: string
): T & {
  kibana: {
    space_ids: string[];
  };
};
/** Build ES term filter for a specific space. */
export declare function buildSpaceFilter(space: string): {
  term: {
    'kibana.space_ids': string;
  };
};
/** Build ES filter to exclude space-bound documents (for space-agnostic searches). */
export declare function buildSpaceAgnosticFilter(): {
  bool: {
    must_not: {
      exists: {
        field: string;
      };
    };
  };
};
