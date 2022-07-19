/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NoNakedESLintDisableRule } from './rules/no_naked_eslint_disable';

/**
 * Custom ESLint rules, add `'@kbn/eslint-plugin-disable'` to your eslint config to use them
 * @internal
 */
export const rules = {
  no_naked_eslint_disable: NoNakedESLintDisableRule,
};
