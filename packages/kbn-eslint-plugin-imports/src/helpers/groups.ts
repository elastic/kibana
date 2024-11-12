/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';

/**
 * Checks whether a given ModuleGroup can import from another one
 * @param importerGroup The group of the module that we are checking
 * @param importedGroup The group of the imported module
 * @param importedVisibility The visibility of the imported module
 * @returns true if importerGroup is allowed to import from importedGroup/Visibiliy
 */
export function isImportableFrom(
  importerGroup: ModuleGroup,
  importedGroup: ModuleGroup,
  importedVisibility: ModuleVisibility
): boolean {
  return importerGroup === importedGroup || importedVisibility === 'shared';
}
