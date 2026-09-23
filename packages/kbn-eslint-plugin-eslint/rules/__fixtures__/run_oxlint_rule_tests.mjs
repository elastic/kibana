/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester: OxlintRuleTester } = await import('oxlint/plugins-dev');
const { createRequire } = await import('node:module');
const { dirname, resolve } = await import('node:path');
const { fileURLToPath } = await import('node:url');

const testDirectory = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const eslint = require('eslint');
const oxlintPlugin = require('../../oxlint_plugin');
const legacyPluginPath = require.resolve('../..');
require.cache[legacyPluginPath] = { exports: oxlintPlugin };

class RuleTester extends OxlintRuleTester {
  constructor(config = {}) {
    const isTypeScript = String(config.parser).includes('@typescript-eslint/parser');
    super({
      eslintCompat: true,
      languageOptions: {
        sourceType: config.parserOptions?.sourceType ?? 'module',
        parserOptions: { lang: isTypeScript ? 'ts' : 'js' },
      },
    });
  }
}

RuleTester.describe = (_, fn) => fn();
RuleTester.it = (_, fn) => fn();
eslint.RuleTester = RuleTester;

const ruleNames = Object.keys(oxlintPlugin.rules).sort();

for (const ruleName of ruleNames) {
  const rule = oxlintPlugin.rules[ruleName];
  if (typeof rule.createOnce !== 'function') {
    throw new Error(`Oxlint plugin rule '${ruleName}' must use createOnce.`);
  }

  const testFile = resolve(testDirectory, `../${ruleName.replaceAll('-', '_')}.test.js`);
  try {
    require.resolve(testFile);
  } catch {
    throw new Error(`Oxlint plugin rule '${ruleName}' has no parity test file.`);
  }

  require(testFile);
}
