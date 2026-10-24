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
const oxlintPlugin = require('../../../oxlint_plugin');
const { REPO_ROOT } = require('@kbn/repo-info');

const ruleCases = {
  no_direct_monaco_import: () =>
    require('../no_direct_monaco_import.cases.ts').noDirectMonacoImportCases,
  no_direct_monaco_theme_calls: () =>
    require('../no_direct_monaco_theme_calls.cases.ts').noDirectMonacoThemeCallsCases,
};

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
const ruleTester = new RuleTester({
  // Case filenames are repo-relative.
  cwd: REPO_ROOT,
  languageOptions: { parserOptions: { lang: 'tsx' } },
});

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const getCases = ruleCases[ruleName];
  if (!getCases) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no test cases.`);
  }

  ruleTester.run(`@kbn/kbn-monaco/${ruleName}`, rule, getCases());
}
