/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect } from '../../../../src/playwright';
import { EuiComboBoxWrapper } from '../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../fixtures/eui_helpers';

test.describe('EUI testing wrapper: EuiComboBox', { tag: ['@svlSecurity', '@ess'] }, () => {
  test(`with multiple selections (pills)`, async ({ page }) => {
    const dataTestSubj = 'demoComboBox';
    await navigateToEuiTestPage(page, 'docs/components/forms/selection/combo-box/');

    await test.step('read selected options', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      expect(await comboBox.getSelectedMultiOptions()).toEqual(['Mimas', 'Iapetus']);
    });

    await test.step('should select option', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      await comboBox.selectMultiOption('Rhea');
      expect(await comboBox.getSelectedMultiOptions()).toEqual(['Mimas', 'Iapetus', 'Rhea']);
    });

    await test.step('should remove option', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      await comboBox.removeOption('Mimas');
      expect(await comboBox.getSelectedMultiOptions()).toEqual(['Iapetus', 'Rhea']);
    });

    await test.step('should select multiple options', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      await comboBox.selectMultiOptions(['Dione', 'Titan']);
      expect(await comboBox.getSelectedMultiOptions()).toEqual([
        'Iapetus',
        'Rhea',
        'Dione',
        'Titan',
      ]);
    });

    await test.step('should clear all the selected options', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      await comboBox.clear();
      expect(await comboBox.getSelectedMultiOptions()).toEqual([]);
    });

    await test.step('should set custom value', async () => {
      const comboBox = new EuiComboBoxWrapper(page, dataTestSubj);
      await comboBox.setCustomMultiOption('Custom Option');
      expect(await comboBox.getSelectedMultiOptions()).toEqual(['Custom Option']);
    });
  });

  test(`with the single selection`, async ({ page }) => {
    const selector = { locator: '[id=":r5:-row"] .euiComboBox' };
    await navigateToEuiTestPage(
      page,
      'docs/components/forms/selection/combo-box/#single-selection-with-custom-options'
    );

    await test.step('should select option from dropdown', async () => {
      const comboBox = new EuiComboBoxWrapper(page, selector);
      await comboBox.selectSingleOption('UI Designer');
      expect(await comboBox.getSelectedValue()).toBe('UI Designer');
    });

    await test.step('should set custom value', async () => {
      const comboBox = new EuiComboBoxWrapper(page, selector);
      await comboBox.setCustomSingleOption('Tester');
      expect(await comboBox.getSelectedValue()).toBe('Tester');
    });

    await test.step('should clear selection', async () => {
      const comboBox = new EuiComboBoxWrapper(page, selector);
      await comboBox.clear();
      expect(await comboBox.getSelectedValue()).toBe('');
    });
  });
});
