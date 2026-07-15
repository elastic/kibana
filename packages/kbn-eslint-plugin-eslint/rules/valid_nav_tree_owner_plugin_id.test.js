/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Path = require('path');
const { RuleTester } = require('eslint');
const rule = require('./valid_nav_tree_owner_plugin_id');

const REPO_ROOT = Path.resolve(__dirname, '../../..');

// Real plugin entry files whose `kibana.jsonc` resolves to a known `plugin.id`.
const ENTERPRISE_SEARCH_FILE = Path.join(
  REPO_ROOT,
  'x-pack/solutions/search/plugins/enterprise_search/public/plugin.ts'
);
const SERVERLESS_SEARCH_FILE = Path.join(
  REPO_ROOT,
  'x-pack/solutions/search/plugins/serverless_search/public/plugin.ts'
);

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const MISMATCH = { messageId: 'mismatch' };

ruleTester.run('@kbn/eslint/valid_nav_tree_owner_plugin_id', rule, {
  valid: [
    {
      name: 'addSolutionNavigation with the correct ownerPluginId',
      filename: ENTERPRISE_SEARCH_FILE,
      code: `navigation.addSolutionNavigation({ id: 'es', navigationTree$, ownerPluginId: 'enterpriseSearch' });`,
    },
    {
      name: 'initNavigation with the correct ownerPluginId',
      filename: SERVERLESS_SEARCH_FILE,
      code: `serverless.initNavigation('es', navigationTree$, 'serverlessSearch');`,
    },
    {
      name: 'no ownerPluginId provided',
      filename: SERVERLESS_SEARCH_FILE,
      code: `serverless.initNavigation('es', navigationTree$);`,
    },
    {
      name: 'ownerPluginId is not a static string literal',
      filename: SERVERLESS_SEARCH_FILE,
      code: `serverless.initNavigation('es', navigationTree$, ownerPluginId);`,
    },
    {
      name: 'unrelated method call',
      filename: SERVERLESS_SEARCH_FILE,
      code: `something.initNavigationOther('es', tree, 'whatever'); foo.register({ ownerPluginId: 'x' });`,
    },
    {
      name: 'file is not inside a plugin (no manifest to compare against)',
      filename: Path.join(REPO_ROOT, 'not-a-plugin/some_file.ts'),
      code: `serverless.initNavigation('es', navigationTree$, 'anything');`,
    },
  ],

  invalid: [
    {
      name: 'addSolutionNavigation with a mismatched ownerPluginId',
      filename: ENTERPRISE_SEARCH_FILE,
      code: `navigation.addSolutionNavigation({ id: 'es', navigationTree$, ownerPluginId: 'serverlessSearch' });`,
      errors: [MISMATCH],
    },
    {
      name: 'initNavigation with a mismatched ownerPluginId',
      filename: SERVERLESS_SEARCH_FILE,
      code: `serverless.initNavigation('es', navigationTree$, 'enterpriseSearch');`,
      errors: [MISMATCH],
    },
  ],
});
