/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Replays the rule's ESLint RuleTester suite through Oxlint's RuleTester. Runs outside Jest
// because `oxlint/plugins-dev` is ESM-only.
const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');

const require = createRequire(import.meta.url);
// Loading the Oxlint entry registers the TypeScript transpiler used by the test modules below.
const oxlintPlugin = require('../../oxlint_plugin');
const eslint = require('eslint');

class RuleTester extends OxlintRuleTester {
  constructor(config = {}) {
    super({
      eslintCompat: true,
      languageOptions: {
        sourceType: config.parserOptions?.sourceType ?? 'module',
        parserOptions: { lang: config.parserOptions?.ecmaFeatures?.jsx ? 'tsx' : 'ts' },
      },
    });
  }
}

const titles = [];
RuleTester.describe = (title, fn) => {
  titles.push(title);
  fn();
  titles.pop();
};
RuleTester.it = (title, fn) => {
  try {
    fn();
  } catch (error) {
    console.error(`Failed: ${[...titles, title].join(' > ')}`);
    throw error;
  }
};
eslint.RuleTester = RuleTester;

const parityTests = {
  require_eui_form_compressed: () => require('../require_eui_form_compressed.test.ts'),
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
