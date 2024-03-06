/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './src/get_import_resolver';
import { NoUnresolvableImportsRule } from './src/rules/no_unresolvable_imports';
import { UniformImportsRule } from './src/rules/uniform_imports';
import { ExportsMovedPackagesRule } from './src/rules/exports_moved_packages';
import { NoUnusedImportsRule } from './src/rules/no_unused_imports';
import { NoBoundaryCrossingRule } from './src/rules/no_boundary_crossing';
import { RequireImportRule } from './src/rules/require_import';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-imports'` to your eslint config to use them
 * @internal
 */
export const rules = {
  no_unresolvable_imports: NoUnresolvableImportsRule,
  uniform_imports: UniformImportsRule,
  exports_moved_packages: ExportsMovedPackagesRule,
  no_unused_imports: NoUnusedImportsRule,
  no_boundary_crossing: NoBoundaryCrossingRule,
  require_import: RequireImportRule,
};
