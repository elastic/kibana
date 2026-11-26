/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('../oxlint_plugin').rules.scout_no_raw_locators;

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const ERROR = { messageId: 'noRawLocator' };

ruleTester.run('@kbn/eslint/scout_no_raw_locators', rule, {
  valid: [
    // Idiomatic Scout API — always allowed regardless of value
    { code: `page.testSubj.locator('subscriptionStatusBadge');` },
    { code: `page.testSubj.locator('~multiWordBadge');` },
    { code: `page.testSubj.locator('parent > child');` },
    { code: `page.testSubj.waitForSelector('loadingSpinner');` },
    { code: `this.page.testSubj.locator('foo');` },
    { code: `await expect(page.testSubj.locator('badge')).toBeVisible();` },

    // Explicit [data-test-subj=...] attribute selectors — all variants
    { code: `page.locator('[data-test-subj="subscriptionStatusBadge"]');` },
    { code: `page.locator('[data-test-subj~="multiWord"]');` },
    { code: `page.locator('[data-test-subj^="prefix"]');` },
    { code: `page.locator('[data-test-subj*="contains"]');` },
    { code: `page.locator('[data-test-subj="parent"] [data-test-subj="child"]');` },
    // Template literal starting with [data-test-subj
    { code: 'page.locator(`[data-test-subj="${name}"]`);' },
    // Template opening with an interpolation: the prefix is unknown, so it is not raw CSS.
    // `euiSelectors` constants are the replacement `scout_no_raw_eui_selectors` recommends.
    {
      code: 'page.locator(`${euiSelectors.contextMenu.PANEL_SELECTOR} [data-test-subj="${action}"]`);',
    },
    { code: 'page.locator(`${euiSelectors.selectable.ROOT_SELECTOR} li`);' },
    { code: 'page.locator(`${prefix}`);' },

    // frameLocator with a data-test-subj attribute selector
    { code: `page.frameLocator('[data-test-subj="vegaSandboxExampleFrame"]');` },
  ],

  invalid: [
    // Raw CSS class selectors
    {
      code: `page.locator('.euiBadge > span');`,
      errors: [ERROR],
    },
    {
      code: `page.locator('div.myClass');`,
      errors: [ERROR],
    },
    // Raw element/attribute selectors unrelated to data-test-subj
    {
      code: `page.locator('input[type="submit"]');`,
      errors: [ERROR],
    },
    // XPath
    {
      code: `page.locator('//div[@class="foo"]');`,
      errors: [ERROR],
    },
    // waitForSelector with raw CSS
    {
      code: `page.waitForSelector('.loading-spinner');`,
      errors: [ERROR],
    },
    // Nested page reference
    {
      code: `this.page.locator('.someClass');`,
      errors: [ERROR],
    },
    // Template literal with raw CSS
    {
      code: 'page.locator(`.euiBadge.${modifier}`);',
      errors: [ERROR],
    },
    // frameLocator with a raw element/CSS selector
    {
      code: `page.frameLocator('iframe');`,
      errors: [ERROR],
    },
    {
      code: `this.panel.frameLocator('.embedded-frame');`,
      errors: [ERROR],
    },
  ],
});
