/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';

const controlGroupReferencePrefix = 'controlGroup_';

export const getReferencesForPanelId = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  const filteredReferences = references
    .filter((reference) => reference.name.indexOf(prefix) === 0)
    .map((reference) => ({ ...reference, name: reference.name.replace(prefix, '') }));
  return filteredReferences;
};

export const getReferencesForControls = (references: Reference[]): Reference[] => {
  return references.filter((reference) => reference.name.startsWith(controlGroupReferencePrefix));
};

export const prefixReferencesFromPanel = (id: string, references: Reference[]): Reference[] => {
  const prefix = `${id}:`;
  return references
    .filter((reference) => reference.type !== 'tag') // panel references should never contain tags. If they do, they must be removed
    .map((reference) => ({
      ...reference,
      name: `${prefix}${reference.name}`,
    }));
};
