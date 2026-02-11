/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect } from '../../../../../src/playwright';
import { EuiSelectableWrapper } from '../../../../../src/playwright/eui_components';
import { navigateToEuiTestPage } from '../../../fixtures/eui_helpers';

// Failing: See https://github.com/elastic/kibana/issues/243242
test.describe.skip('EUI testing wrapper: EuiSelectable', { tag: ['@svlSecurity', '@ess'] }, () => {
  test(`selectable with search field`, async ({ page, log }) => {
    const selector = {
      locator: 'xpath=//h2[@id="searchable"]/following::div[contains(@class, "euiSelectable")][1]',
    };
    await navigateToEuiTestPage(
      page,
      'docs/components/forms/selection/selectable/#searchable',
      log
    );

    await test.step('read selected options', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      const selectedOptions = await selectable.getSelectedOptions();
      expect(selectedOptions, 'Default selected options do not match').toStrictEqual([
        'Mimas',
        'Iapetus',
      ]);
    });

    await test.step('should search and select option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.searchAndSelectFirst('Rhea');
      const selectedOptions = await selectable.getSelectedOptions();
      expect(
        selectedOptions,
        'Selected options do not match after the new one was searched and added'
      ).toStrictEqual(['Mimas', 'Iapetus', 'Rhea']);
    });

    await test.step('should unselect option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.unselect('Mimas');
      const selectedOptions = await selectable.getSelectedOptions();
      expect(
        selectedOptions,
        'Selected options do not match after the option was unselected'
      ).toStrictEqual(['Iapetus', 'Rhea']);
    });

    await test.step('should select option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.select('Titan');
      const selectedOptions = await selectable.getSelectedOptions();
      expect(
        selectedOptions,
        'Selected options do not match after the option was selected'
      ).toStrictEqual(['Titan', 'Iapetus', 'Rhea']);
    });
  });
});
