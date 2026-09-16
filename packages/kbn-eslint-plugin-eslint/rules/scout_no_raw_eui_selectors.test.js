/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('./scout_no_raw_eui_selectors');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const options = [
  {
    restricted: [
      {
        selector: '.euiComboBoxPill',
        replacement: 'euiComponents.comboBox(testSubj).getSelectedOptions()',
      },
    ],
  },
];

const message =
  'Raw EUI class selector `.euiComboBoxPill` is restricted. Use euiComponents.comboBox(testSubj).getSelectedOptions() instead.';

ruleTester.run('@kbn/eslint/scout_no_raw_eui_selectors', rule, {
  valid: [
    {
      code: `page.locator('[data-test-subj="filterParams"]');`,
      options,
    },
    {
      code: `page.testSubj.locator('filterParamsComboBox');`,
      options,
    },
    {
      code: `page.locator('.euiComboBoxPill');`,
      options: [{ restricted: [] }],
    },
    {
      code: `page.locator(someVariable);`,
      options,
    },
    {
      code: `page.locator('.euiComboBoxPill__cross');`,
      options,
    },
    {
      code: `page.locator('.euiComboBoxPillButton');`,
      options,
    },
  ],

  invalid: [
    {
      code: `page.locator('[data-test-subj="filterParams"] .euiComboBoxPill');`,
      options,
      errors: [{ message }],
    },
    {
      code: `page.locator('.euiComboBoxPill');`,
      options,
      errors: [{ message }],
    },
    {
      code: `page.$('.euiComboBoxPill');`,
      options,
      errors: [{ message }],
    },
    {
      code: 'page.locator(`[data-test-subj="filterParams"] .euiComboBoxPill`);',
      options,
      errors: [{ message }],
    },
    {
      code: 'page.locator(`${scope} .euiComboBoxPill`);',
      options,
      errors: [{ message }],
    },
    {
      code: `filterEditor.locator('.euiComboBoxPill').first();`,
      options,
      errors: [{ message }],
    },
  ],
});
