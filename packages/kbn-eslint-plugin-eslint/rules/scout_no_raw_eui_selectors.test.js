/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Shape of the real package: one `Eui<Component>Selectors` object per Component
// Object, `*_SELECTOR` entries are CSS classes, `*_TEST_SUBJ` entries are not.
jest.mock('@elastic/eui-test-helpers', () => ({
  EuiComboBoxObject: class {},
  EuiComboBoxSelectors: {
    ROOT_SELECTOR: '.euiComboBox',
    PILL_SELECTOR: '.euiComboBoxPill',
    SEARCH_INPUT_TEST_SUBJ: 'comboBoxSearchInput',
    optionFor: (testSubj) => `[data-test-subj~="${testSubj}-optionsList"] [role="option"]`,
  },
  EuiDataGridSelectors: {
    ROW_SELECTOR: '.euiDataGridRow',
    FULL_SCREEN_BUTTON_TEST_SUBJ: 'dataGridFullScreenButton',
  },
}));

const { RuleTester } = require('eslint');
const rule = require('./scout_no_raw_eui_selectors');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
});

const pill =
  '`.euiComboBoxPill` is an internal of EuiComboBox. Use the EuiComboBoxObject Component Object from @elastic/eui-test-helpers (page.components in Scout) instead of a raw selector.';
const row =
  '`.euiDataGridRow` is an internal of EuiDataGrid. Use the EuiDataGridObject Component Object from @elastic/eui-test-helpers (page.components in Scout) instead of a raw selector.';

describe('loadEuiSelectors', () => {
  it('collects only string *_SELECTOR entries that are EUI classes', () => {
    expect(rule.loadEuiSelectors()).toEqual([
      { selector: '.euiComboBox', component: 'EuiComboBox', object: 'EuiComboBoxObject' },
      { selector: '.euiComboBoxPill', component: 'EuiComboBox', object: 'EuiComboBoxObject' },
      { selector: '.euiDataGridRow', component: 'EuiDataGrid', object: 'EuiDataGridObject' },
    ]);
  });
});

ruleTester.run('@kbn/eslint/scout_no_raw_eui_selectors', rule, {
  valid: [
    { code: `page.locator('[data-test-subj="filterParams"]');` },
    { code: `page.testSubj.locator('filterParamsComboBox');` },
    { code: `page.locator(someVariable);` },
    // test-subj values are never restricted, only CSS classes
    { code: `page.locator('[data-test-subj="comboBoxSearchInput"]');` },
    // class-token boundary: a restricted class must not flag its children or longer names
    { code: `page.locator('.euiComboBoxPill__cross');` },
    { code: `page.locator('.euiComboBoxPillButton');` },
    // a class with no Component Object is not a violation
    { code: `page.locator('.euiFlyoutFooter');` },
  ],

  invalid: [
    {
      code: `page.locator('[data-test-subj="filterParams"] .euiComboBoxPill');`,
      errors: [{ message: pill }],
    },
    { code: `page.locator('.euiComboBoxPill');`, errors: [{ message: pill }] },
    { code: `page.$('.euiDataGridRow');`, errors: [{ message: row }] },
    {
      code: 'page.locator(`[data-test-subj="filterParams"] .euiComboBoxPill`);',
      errors: [{ message: pill }],
    },
    { code: 'page.locator(`${scope} .euiDataGridRow`);', errors: [{ message: row }] },
    { code: `filterEditor.locator('.euiComboBoxPill').first();`, errors: [{ message: pill }] },
  ],
});
