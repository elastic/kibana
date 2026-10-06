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
  formatted_message_should_start_with_the_right_id: () =>
    require('../formatted_message_should_start_with_the_right_id.test.ts'),
  i18n_translate_should_start_with_the_right_id: () =>
    require('../i18n_translate_should_start_with_the_right_id.test.ts'),
  strings_should_be_translated_with_formatted_message: () =>
    require('../strings_should_be_translated_with_formatted_message.test.ts'),
  strings_should_be_translated_with_i18n: () =>
    require('../strings_should_be_translated_with_i18n.test.ts'),
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
