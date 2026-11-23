/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleGroup, ModuleVisibility } from '@kbn/projects-solutions-groups';
import type { ModuleId } from '@kbn/repo-source-classifier';
import { CORE_PRIVATE_IMPORTERS } from './core_private_importers';

export type ImportViolation = 'CORE_PRIVATE_IMPORT' | 'ILLEGAL_IMPORT';

const isInCore = ({ repoRel }: ModuleId): boolean => repoRel.startsWith('src/core/');

const isCorePrivateImport = (from: ModuleId, imported: ModuleId): boolean =>
  imported.visibility === 'private' && isInCore(imported) && !isInCore(from);

/**
 * Returns why `from` may not import `imported`, or undefined if the import is allowed
 */
export const getImportViolation = (
  from: ModuleId,
  imported: ModuleId
): ImportViolation | undefined => {
  if (isCorePrivateImport(from, imported) && !CORE_PRIVATE_IMPORTERS.has(from.repoRel)) {
    return 'CORE_PRIVATE_IMPORT';
  }
  return isImportableFrom(from, imported.group, imported.visibility) ? undefined : 'ILLEGAL_IMPORT';
};

/**
 * Checks whether a given ModuleGroup can import from another one
 * @param from The ModuleId object that defines the "import" statement
 * @param importedGroup The group of the imported module
 * @param importedVisibility The visibility of the imported module
 * @returns true if "from" is allowed to import from importedGroup/Visibility
 */
export function isImportableFrom(
  from: ModuleId,
  importedGroup: ModuleGroup,
  importedVisibility: ModuleVisibility
): boolean {
  return (
    (isDevOnly(from) && importedGroup === 'platform') ||
    from.group === importedGroup ||
    importedVisibility === 'shared'
  );
}

/**
 * Checks whether the given module is supposed to be used at dev/build/test time only
 * @param module The module to check
 * @returns true if the module is a dev-only module, false otherwise
 * @see Package#isDevOnly (src/platform/packages/private/kbn-repo-packages/modern/package.js)
 */
function isDevOnly(module: ModuleId) {
  return (
    !module.manifest ||
    !!module.manifest?.devOnly ||
    module.manifest?.type === 'functional-tests' ||
    module.manifest?.type === 'test-helper'
  );
}
