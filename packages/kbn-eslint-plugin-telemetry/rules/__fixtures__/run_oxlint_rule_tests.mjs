/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Runs outside Jest because `oxlint/plugins-dev` is ESM-only.
const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
const eslint = require('eslint');
// Loading the Oxlint entry registers the TypeScript transpiler used by the test files below.
const oxlintPlugin = require('../../oxlint_plugin');

class RuleTester extends OxlintRuleTester {
  constructor() {
    // Every case sets `filename`, so Oxlint picks the parser from its extension. ESLint's RuleTester
    // lints with `process.cwd()` as `cwd`, which is the repository root here.
    super({ eslintCompat: true, cwd: process.cwd() });
  }
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
eslint.RuleTester = RuleTester;
// The test files group the runs for each ESLint parser with Jest's global `describe`.
global.describe = (_, fn) => fn();

const parityTests = {
  ebt_props_should_be_present: () => require('../ebt_props_should_be_present.test.ts'),
  event_generating_elements_should_be_instrumented: () =>
    require('../event_generating_elements_should_be_instrumented.test.ts'),
};

for (const [ruleName, rule] of Object.entries(oxlintPlugin.rules)) {
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const runParityTest = parityTests[ruleName];
  if (!runParityTest) {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no parity test.`);
  }

  runParityTest();
}
