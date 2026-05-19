/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generic hook for toggling a value in any field filter via EUI Query mutations.
 *
 * Parses the current `queryText` → mutates the EUI Query → dispatches the
 * new text. Same pattern as `useFieldQueryFilter` in the toolbar, but works
 * from outside EuiSearchBar (e.g., avatar clicks, tag badge clicks).
 *
 * For known filters, prefer the convenience wrappers
 * {@link useTagFilterToggle} and {@link useCreatedByFilterToggle}.
 *
 * @param fieldName - The field name (e.g., `'tag'`, `'createdBy'`).
 * @returns A toggle callback `(id, type?) => void`.
 */
export declare const useFilterToggle: (
  fieldName: string
) => (id: string, type?: 'include' | 'exclude') => void;
/** Convenience wrapper around {@link useFilterToggle} for the `tag` field. */
export declare const useTagFilterToggle: () => (id: string, type?: 'include' | 'exclude') => void;
/** Convenience wrapper around {@link useFilterToggle} for the `createdBy` field. */
export declare const useCreatedByFilterToggle: () => (
  id: string,
  type?: 'include' | 'exclude'
) => void;
