/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { EuiSelectableWrapper } from '@kbn/scout';

export interface BreakdownSelector {
  readonly button: Locator;
  readonly search: Locator;
  readonly selectable: Locator;
  readonly getOption: (dimensionName: string) => Locator;
  readonly getButtonWithSelectedDimension: (dimensionName: string) => Locator;
  readonly selectDimension: (dimensionName: string) => Promise<void>;
}

export function createBreakdownSelector(page: ScoutPage): BreakdownSelector {
  const selectableWrapper = new EuiSelectableWrapper(
    page,
    'metricsExperienceBreakdownSelectorSelectable'
  );
  const button = page.testSubj.locator('metricsExperienceBreakdownSelectorButton');
  const selectable = page.testSubj.locator('metricsExperienceBreakdownSelectorSelectable');

  return {
    button,
    search: page.testSubj.locator('metricsExperienceBreakdownSelectorSelectorSearch'),
    selectable,
    getOption: (dimensionName: string) =>
      page.testSubj.locator(`metricsBreakdownOption-${dimensionName}`),
    getButtonWithSelectedDimension: (dimensionName: string) =>
      page.locator(
        `[data-test-subj="metricsExperienceBreakdownSelectorButton"][data-selected-value*="${dimensionName}"]`
      ),
    selectDimension: async (dimensionName: string) => {
      if (!(await selectable.isVisible())) {
        await button.click();
        await selectable.waitFor({ state: 'visible' });
      }
      await selectableWrapper.searchAndSelectFirst(dimensionName);
    },
  };
}
