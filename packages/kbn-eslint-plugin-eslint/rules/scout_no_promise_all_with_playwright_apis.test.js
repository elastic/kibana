/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_promise_all_with_playwright_apis');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const errors = [{ messageId: 'noPromiseAll' }];

ruleTester.run('@kbn/eslint/scout_no_promise_all_with_playwright_apis', rule, {
  valid: [
    // Sequential awaits — the recommended pattern.
    {
      code: `
        await this.latencyChart.waitFor();
        await this.throughputChart.waitFor();
      `,
    },
    // Promise.all over non-Playwright work (apiServices / kbnClient) is fine.
    {
      code: `
        await Promise.all([
          apiServices.sampleData.install('logs'),
          apiServices.sampleData.install('flights'),
        ]);
      `,
    },
    // Listener-then-trigger pattern — listener method names are deliberately
    // not in the denylist so this works without a special case.
    {
      code: `
        const [popup] = await Promise.all([
          page.waitForEvent('popup'),
          link.click(),
        ]);
      `,
    },
    {
      code: `
        await Promise.all([
          page.waitForURL('**/app/discover**'),
          locator.click(),
        ]);
      `,
    },
    {
      code: `
        await Promise.all([
          page.waitForResponse('**/api/foo'),
          button.click(),
        ]);
      `,
    },
    // Promise.all over generic / custom helpers (not Playwright methods).
    {
      code: `
        await Promise.all([
          waitForChartToLoad(this.page, this.latencyChart),
          waitForChartToLoad(this.page, this.throughputChart),
        ]);
      `,
    },
    {
      code: `
        await Promise.all(promises);
      `,
    },
  ],

  invalid: [
    // Multiple locator waits — the canonical bad pattern.
    {
      code: `
        await Promise.all([
          this.latencyChart.waitFor({ state: 'visible' }),
          this.throughputChart.waitFor({ state: 'visible' }),
        ]);
      `,
      errors,
    },
    // Mixed locator wait and waitForSelector.
    {
      code: `
        await Promise.all([
          this.chart.waitFor(),
          page.waitForSelector('mainContent'),
        ]);
      `,
      errors,
    },
  ],
});
