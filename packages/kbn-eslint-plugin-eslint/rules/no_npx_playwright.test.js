/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./no_npx_playwright');
const dedent = require('dedent');

const ERROR_MSG =
  "Do not use 'npx playwright' — use 'node scripts/playwright' instead. " +
  'npx may auto-install a different Playwright version, bypassing the pinned @playwright/test dependency.';

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

ruleTester.run('@kbn/eslint/no_npx_playwright', rule, {
  valid: [
    // Safe: uses node scripts/playwright
    {
      code: dedent`
        execSync('node scripts/playwright test --config config.ts');
      `,
    },
    // Safe: uses node_modules/.bin/playwright (programmatic, no auto-install risk)
    {
      code: dedent`
        spawn('./node_modules/.bin/playwright', ['test']);
      `,
    },
    // Safe: unrelated exec call
    {
      code: dedent`
        exec('node scripts/jest src/foo.test.ts');
      `,
    },
    // Safe: npx with something other than playwright
    {
      code: dedent`
        execSync('npx some-other-tool');
      `,
    },
    // Safe: string not inside a shell call
    {
      code: dedent`
        const cmd = 'npx playwright test';
      `,
    },
  ],

  invalid: [
    // exec with npx playwright
    {
      code: dedent`
        exec('npx playwright test --config config.ts');
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // execSync with npx playwright
    {
      code: dedent`
        execSync('npx playwright test');
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // spawn with npx playwright as first arg
    {
      code: dedent`
        spawn('npx playwright show-report ./output/reports');
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // spawnSync with npx playwright
    {
      code: dedent`
        spawnSync('npx playwright show-trace ./trace.zip');
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // execa with npx playwright
    {
      code: dedent`
        execa('npx playwright test', ['--config', 'config.ts']);
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // member expression: child_process.exec
    {
      code: dedent`
        child_process.exec('npx playwright test');
      `,
      errors: [{ message: ERROR_MSG }],
    },
    // template literal with npx playwright
    {
      code: dedent`
        execSync(\`npx playwright test --config \${configPath}\`);
      `,
      errors: [{ message: ERROR_MSG }],
    },
  ],
});
