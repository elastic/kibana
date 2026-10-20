/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Rule } from 'eslint';
import type { CreateOnceRule } from '@oxlint/plugins';
import { eslintCompatPlugin } from '@oxlint/plugins';

export * from './src/get_import_resolver';
import { NoUnresolvableImportsRule } from './src/rules/no_unresolvable_imports';
import { UniformImportsRule } from './src/rules/uniform_imports';
import { ExportsMovedPackagesRule } from './src/rules/exports_moved_packages';
import { NoUnusedImportsRule } from './src/rules/no_unused_imports';
import { NoBoundaryCrossingRule } from './src/rules/no_boundary_crossing';
import { NoGroupCrossingImportsRule } from './src/rules/no_group_crossing_imports';
import { NoGroupCrossingManifestsRule } from './src/rules/no_group_crossing_manifests';
import { RequireImportRule } from './src/rules/require_import';
import { NoDirectHandlebarsImportRule } from './src/rules/no_direct_handlebars_import';
import { NoDirectMonacoImportRule } from './src/rules/no_direct_monaco_import';
import { NoUndeclaredPluginTargetRule } from './src/rules/no_undeclared_plugin_target';
import { NoReduxToolkitV2ImportsRule } from './src/rules/no_redux_toolkit_v2_imports';

const plugin = eslintCompatPlugin({
  meta: { name: '@kbn/imports' },
  rules: {
    no_unresolvable_imports: NoUnresolvableImportsRule,
    uniform_imports: UniformImportsRule,
    exports_moved_packages: ExportsMovedPackagesRule,
    no_unused_imports: NoUnusedImportsRule,
    no_boundary_crossing: NoBoundaryCrossingRule,
    no_group_crossing_imports: NoGroupCrossingImportsRule,
    no_group_crossing_manifests: NoGroupCrossingManifestsRule,
    require_import: RequireImportRule,
    no_direct_handlebars_import: NoDirectHandlebarsImportRule,
    no_direct_monaco_import: NoDirectMonacoImportRule,
    no_undeclared_plugin_target: NoUndeclaredPluginTargetRule,
    no_redux_toolkit_v2_imports: NoReduxToolkitV2ImportsRule,
  },
});

export const { meta } = plugin;

/**
 * Custom rules run by Oxlint through `oxlint_plugin.js`. `eslintCompatPlugin` adds an ESLint
 * `create` method next to each rule's `createOnce`, so ESLint still loads the plugin as
 * `'@kbn/eslint-plugin-imports'` and runs the rules in its RuleTester.
 * @internal
 */
export const rules = plugin.rules as Record<string, CreateOnceRule & Rule.RuleModule>;
