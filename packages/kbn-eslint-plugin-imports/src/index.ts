/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export * from './resolve_kibana_import';
export * from './resolve_result';

import { NoUnresolvedImportsRule } from './rules/no_unresolved_imports';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-imports'` to your eslint config to use them
 * @internal
 */
export const rules = {
  no_unresolved_imports: NoUnresolvedImportsRule,
};
