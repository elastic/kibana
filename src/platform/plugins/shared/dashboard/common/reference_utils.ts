/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';

export const getPanelIdFromReference = (reference: Reference) => {
  const splits = reference.name.split(':', 1);
  return splits.length ? splits[0] : undefined;
};

/**
 * Retrieves references for a specific panel by its ID.
 * Filters references that match the panel ID prefix and removes the prefix from the reference names.
 *
 * @param id - The panel ID to filter references for.
 * @param references - The array of {@link Reference} objects to filter.
 * @returns An array of {@link Reference} objects belonging to the specified panel.
 */
export const getReferencesForPanelId = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  const filteredReferences = references
    .filter((reference) => reference.name.indexOf(prefix) === 0)
    .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));
  return filteredReferences;
};

/**
 * Prefixes references from a panel with the panel ID.
 * This is used when extracting references from panels to store at the dashboard level.
 * Tag references are filtered out as they should not be included in panel references.
 *
 * @param id - The panel ID to use as prefix.
 * @param references - The array of {@link Reference} objects to prefix.
 * @returns An array of {@link Reference} objects with prefixed names.
 */
export const prefixReferencesFromPanel = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  return references
    .filter((reference) => reference.type !== 'tag') // panel references should never contain tags. If they do, they must be removed
    .map((reference) => ({
      ...reference,
      name: `${prefix}${reference.name}`,
    }));
};
