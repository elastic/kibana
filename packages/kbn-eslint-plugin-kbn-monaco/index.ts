/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import { eslintCompatPlugin, type CreateOnceRule } from '@oxlint/plugins';
import { NoDirectMonacoImportRule } from './src/rules/no_direct_monaco_import';
import { NoDirectMonacoThemeCallsRule } from './src/rules/no_direct_monaco_theme_calls';

const plugin = eslintCompatPlugin({
  meta: { name: '@kbn/kbn-monaco' },
  rules: {
    no_direct_monaco_import: NoDirectMonacoImportRule,
    no_direct_monaco_theme_calls: NoDirectMonacoThemeCallsRule,
  },
});

export const { meta } = plugin;

/**
 * Custom rules guarding the `@kbn/monaco` and `@kbn/code-editor` boundary, run by Oxlint through
 * `oxlint_plugin.js`; `eslintCompatPlugin` keeps them loadable by ESLint as
 * `'@kbn/eslint-plugin-kbn-monaco'`.
 * @internal
 */
export const rules = plugin.rules as Record<string, CreateOnceRule & Rule.RuleModule>;
