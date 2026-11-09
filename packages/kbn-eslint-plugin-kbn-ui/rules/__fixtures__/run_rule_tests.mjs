/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs outside Jest because `oxlint/plugins-dev` is ESM-only.
const { RuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
// Loading the Oxlint entry registers the TypeScript transpiler used by the case modules below.
const oxlintPlugin = require('../../oxlint_plugin');
const { REPO_ROOT } = require('@kbn/repo-info');

const ruleCases = {
  no_restricted_package_imports: () =>
    require('../no_restricted_package_imports.cases.ts').noRestrictedPackageImportsCases,
  portable_imports: () => require('../portable_imports.cases.ts').portableImportsCases,
  prefer_kbn_ui_callout: () => require('../prefer_kbn_ui_callout.cases.ts').preferKbnUiCalloutCases,
  prefer_toast_action_props: () =>
    require('../prefer_toast_action_props.cases.ts').preferToastActionPropsCases,
};

// `portable_imports` aliases typescript-eslint's `no-restricted-imports`, which uses `create`.
const CREATE_API_RULES = new Set(['portable_imports']);

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
const ruleTester = new RuleTester({
  // Case filenames are repo-relative.
  cwd: REPO_ROOT,
  languageOptions: { parserOptions: { lang: 'tsx' } },
});

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  const api = CREATE_API_RULES.has(ruleName) ? 'create' : 'createOnce';
  if (typeof rule[api] !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use ${api}.`);
  }

  const getCases = ruleCases[ruleName];
  if (!getCases) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no test cases.`);
  }

  ruleTester.run(`@kbn/kbn-ui/${ruleName}`, rule, getCases());
}
