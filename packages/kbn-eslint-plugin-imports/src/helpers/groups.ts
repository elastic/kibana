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
 * A package flagged `devOnly` (or a test-helper / functional-tests package).
 * Non-package files are not included: they have no manifest, which `isDevOnly`
 * treats as true so they may import platform code.
 */
export function isDevOnlyPackage(module: { manifest?: ModuleId['manifest'] }): boolean {
  return (
    !!module.manifest?.devOnly ||
    module.manifest?.type === 'functional-tests' ||
    module.manifest?.type === 'test-helper'
  );
}

/**
 * Production runtime code cannot import a `devOnly` package. Other `devOnly`
 * packages, test/mock files, and tooling can.
 */
export function mayImportDevOnlyPackage(from: ModuleId): boolean {
  return isDevOnly(from) || from.type === 'tests or mocks' || from.type === 'tooling';
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
