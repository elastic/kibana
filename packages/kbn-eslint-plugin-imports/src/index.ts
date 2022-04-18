/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './get_import_resolver';
import { NoUnresolvableImportsRule } from './rules/no_unresolvable_imports';
import { UniformImportsRule } from './rules/uniform_imports';
import { ExportsMovedPackagesRule } from './rules/exports_moved_packages';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-imports'` to your eslint config to use them
 * @internal
 */
export const rules = {
  no_unresolvable_imports: NoUnresolvableImportsRule,
  uniform_imports: UniformImportsRule,
  exports_moved_packages: ExportsMovedPackagesRule,
};
