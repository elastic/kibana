/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { test, expect } from '../../../src/playwright';
import { EuiSelectableWrapper } from '../../../src/playwright/eui_components';
import { getEuiBaseUrlWithVersion } from '../../fixtures/eui_helpers';

test.describe('EUI testing wrapper: EuiSelectable', { tag: ['@svlSecurity', '@ess'] }, () => {
  const euiBaseUrl = getEuiBaseUrlWithVersion();
  test('selectable with search field', async ({ page }) => {
    await page.goto(`${euiBaseUrl}/docs/components/forms/selection/selectable/#searchable`);

    const selector = {
      locator: 'xpath=//h2[@id="searchable"]/following::div[contains(@class, "euiSelectable")][1]',
    };

    await test.step('read selected options', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      expect(await selectable.getSelectedOptions()).toEqual(['Mimas', 'Iapetus']);
    });

    await test.step('should search and select option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.searchAndSelectFirst('Rhea');
      expect(await selectable.getSelectedOptions()).toEqual(['Mimas', 'Iapetus', 'Rhea']);
    });

    await test.step('should unselect option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.unselect('Mimas');
      expect(await selectable.getSelectedOptions()).toEqual(['Iapetus', 'Rhea']);
    });

    await test.step('should select option', async () => {
      const selectable = new EuiSelectableWrapper(page, selector);
      await selectable.select('Titan');
      expect(await selectable.getSelectedOptions()).toEqual(['Titan', 'Iapetus', 'Rhea']);
    });
  });
});
