/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ModuleGroup, ModuleVisibility } from '@kbn/repo-info/types';
import type { ModuleId } from '@kbn/repo-source-classifier';

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
 * @see Package#isDevOnly (packages/kbn-repo-packages/modern/package.js)
 */
function isDevOnly(module: ModuleId) {
  return (
    !module.manifest ||
    !!module.manifest?.devOnly ||
    module.manifest?.type === 'functional-tests' ||
    module.manifest?.type === 'test-helper'
  );
}
