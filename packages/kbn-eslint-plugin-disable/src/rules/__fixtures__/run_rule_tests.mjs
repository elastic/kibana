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

const ruleCases = {
  no_naked_eslint_disable: () =>
    require('../no_naked_eslint_disable.cases.ts').noNakedESLintDisableCases,
  no_protected_eslint_disable: () =>
    require('../no_protected_eslint_disable.cases.ts').noProtectedESLintDisableCases,
};

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
const ruleTester = new RuleTester();

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const getCases = ruleCases[ruleName];
  if (!getCases) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no test cases.`);
  }

  ruleTester.run(`@kbn/disable/${ruleName}`, rule, getCases());
}
