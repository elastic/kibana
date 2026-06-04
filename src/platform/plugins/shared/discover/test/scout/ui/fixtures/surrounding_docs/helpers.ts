/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Adds a filter via the filter bar popover without asserting a single filter badge exists afterward.
 * This avoids Playwright strict mode violations when multiple filters are already present.
 */
export async function addFilterWithoutStrictCheck(
  page: ScoutPage,
  field: string,
  value: string
): Promise<void> {
  await page.testSubj.click('addFilter');
  await page.testSubj.waitForSelector('addFilterPopover');
  await page.testSubj.typeWithDelay('filterFieldSuggestionList > comboBoxSearchInput', field);
  await page.click(`.euiComboBoxOption[title="${field}"]`);
  await expect(page.testSubj.locator('filterOperatorList')).not.toHaveClass(
    /euiComboBox-isDisabled/
  );
  await page.testSubj.typeWithDelay('filterOperatorList > comboBoxSearchInput', 'is');
  await page.click('.euiComboBoxOption[title="is"]');
  const filterParamsInput = page.locator('[data-test-subj="filterParams"] input');
  await expect(filterParamsInput).toBeEditable();
  await filterParamsInput.focus();
  await page.typeWithDelay('[data-test-subj="filterParams"] input', value);
  await page.testSubj.click('saveFilter');
  await expect(page.testSubj.locator('addFilterPopover')).toBeHidden();
}

/**
 * Adds multiple "is" filters in sequence.
 */
export async function addFilters(page: ScoutPage, filters: Array<[string, string]>): Promise<void> {
  for (const [field, value] of filters) {
    await addFilterWithoutStrictCheck(page, field, value);
  }
}
