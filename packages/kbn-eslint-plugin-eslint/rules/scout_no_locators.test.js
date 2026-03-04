/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_locators');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const options = [{ forbidden: ['globalLoadingIndicator'] }];

ruleTester.run('@kbn/eslint/scout_no_locators', rule, {
  valid: [
    {
      code: `page.testSubj.locator('allowedLocator');`,
      options,
    },
    {
      code: `page.testSubj.click('globalLoadingIndicator');`,
      options,
    },
    {
      code: `page.testSubj.waitForSelector('allowedLocator', { state: 'visible' });`,
      options,
    },
    {
      code: `page.testSubj.locator('globalLoadingIndicator');`,
      options: [{ forbidden: [] }],
    },
  ],

  invalid: [
    {
      code: `page.testSubj.locator('globalLoadingIndicator');`,
      options,
      errors: [
        {
          message: `The locator \`testSubj.locator('globalLoadingIndicator')\` is forbidden. Tests should not depend on this element.`,
        },
      ],
    },
    {
      code: `this.page.testSubj.locator('globalLoadingIndicator');`,
      options,
      errors: [
        {
          message: `The locator \`testSubj.locator('globalLoadingIndicator')\` is forbidden. Tests should not depend on this element.`,
        },
      ],
    },
    {
      code: `await expect(page.testSubj.locator('globalLoadingIndicator')).toBeHidden();`,
      options,
      errors: [
        {
          message: `The locator \`testSubj.locator('globalLoadingIndicator')\` is forbidden. Tests should not depend on this element.`,
        },
      ],
    },
    {
      code: `await page.testSubj.waitForSelector('globalLoadingIndicator', { state: 'hidden' });`,
      options,
      errors: [
        {
          message: `The locator \`testSubj.waitForSelector('globalLoadingIndicator')\` is forbidden. Tests should not depend on this element.`,
        },
      ],
    },
  ],
});
