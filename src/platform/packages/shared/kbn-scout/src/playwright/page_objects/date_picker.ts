/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';
import { expect } from '..';
import type { Locator } from '../../..';

export enum DateUnitSelector {
  Seconds = 's',
  Minutes = 'm',
  Hours = 'h',
}

export class DatePicker {
  constructor(private readonly page: ScoutPage) {}

  private getTestSubjLocator(selector: string, containerLocator?: Locator) {
    return containerLocator
      ? containerLocator.getByTestId(selector)
      : this.page.testSubj.locator(selector);
  }

  private async openCustomRangePanel(containerLocator?: Locator) {
    const controlButton = this.getTestSubjLocator('dateRangePickerControlButton', containerLocator);

    await controlButton.waitFor();

    // Close any open suggestion lists that might block the date picker button
    const isSuggestionListVisible = await this.page.locator('div.kbnTypeahead').isVisible();
    if (isSuggestionListVisible) {
      await this.getTestSubjLocator('unifiedTabs_tabsBar').click();
      await this.page.locator('div.kbnTypeahead').waitFor({ state: 'hidden' });
    }

    if (!(await controlButton.isVisible({ timeout: 2000 }))) {
      await expect
        .poll(
          async () => {
            await this.page.reload();
            await this.getTestSubjLocator(
              'dateRangePickerControlButton',
              containerLocator
            ).waitFor();
            return controlButton.isVisible();
          },
          {
            timeout: 20000,
            intervals: [500],
          }
        )
        .toBe(true);
    }

    await controlButton.click();
    await this.getTestSubjLocator('dateRangePickerCustomRangeNavItem', containerLocator).click();
    await this.getTestSubjLocator('dateRangePickerCustomRangePanel', containerLocator).waitFor();
  }

  private async setDatePart(side: 'Start' | 'End', value: string, containerLocator?: Locator) {
    const datePart = this.getTestSubjLocator(`dateRangePicker${side}DatePart`, containerLocator);
    // Click the Absolute tab in the button group
    await datePart.getByRole('button', { name: 'Absolute' }).click();
    // Fill in the text field
    const input = datePart.getByRole('textbox');
    await input.clear();
    await input.fill(value);
  }

  async typeAbsoluteRange({
    from,
    to,
    validateDates = false,
    containerLocator,
  }: {
    from: string;
    to: string;
    validateDates?: boolean;
    containerLocator?: Locator;
  }) {
    await this.setDatePart('Start', from, containerLocator);
    await this.setDatePart('End', to, containerLocator);
    await this.getTestSubjLocator(
      'dateRangePickerCustomRangeApplyButton',
      containerLocator
    ).click();

    if (validateDates) {
      // After applying, verify the control button reflects the new range
      const controlButton = this.getTestSubjLocator(
        'dateRangePickerControlButton',
        containerLocator
      );
      await expect(
        controlButton,
        `Date picker should reflect the updated time range`
      ).toBeVisible();
    }

    await this.getTestSubjLocator('querySubmitButton', containerLocator).click();
  }

  async setCommonlyUsedTime(option: string) {
    await this.page.testSubj.locator('dateRangePickerControlButton').click();
    await this.page.testSubj.locator('dateRangePickerMainPanel').waitFor();
    const presetItem = this.page.testSubj.locator(`dateRangePickerPresetItem-${option}`);
    await expect(presetItem).toBeVisible();
    await presetItem.click();
  }

  async setAbsoluteRange({ from, to }: { from: string; to: string }) {
    await this.openCustomRangePanel();
    await this.typeAbsoluteRange({ from, to, validateDates: true });
  }

  async setAbsoluteRangeInRootContainer({
    from,
    to,
    containerLocator,
  }: {
    from: string;
    to: string;
    containerLocator: Locator;
  }) {
    await this.openCustomRangePanel(containerLocator);
    await this.typeAbsoluteRange({ from, to, validateDates: true, containerLocator });
  }

  async getTimeConfig(): Promise<{ start: string; end: string }> {
    await this.openCustomRangePanel();

    const startInput = this.page.testSubj
      .locator('dateRangePickerStartDatePart')
      .getByRole('textbox');
    const endInput = this.page.testSubj.locator('dateRangePickerEndDatePart').getByRole('textbox');

    // Ensure Absolute tab is selected to read the text fields
    await this.page.testSubj
      .locator('dateRangePickerStartDatePart')
      .getByRole('button', { name: 'Absolute' })
      .click();
    await this.page.testSubj
      .locator('dateRangePickerEndDatePart')
      .getByRole('button', { name: 'Absolute' })
      .click();

    const start = await startInput.inputValue();
    const end = await endInput.inputValue();

    // Close the panel without applying
    await this.page.keyboard.press('Escape');

    return { start, end };
  }

  async startAutoRefresh(interval: number, dateUnit: DateUnitSelector = DateUnitSelector.Seconds) {
    // Navigate to the settings panel where auto-refresh is configured
    await this.page.testSubj.locator('dateRangePickerControlButton').click();
    await this.page.testSubj.locator('dateRangePickerSettingsButton').click();
    await this.page.testSubj.locator('dateRangePickerSettingsPanel').waitFor();

    const refreshIntervalInput = this.page.testSubj.locator(
      'dateRangePickerAutoRefreshIntervalInput'
    );
    const refreshIntervalUnitSelect = this.page.testSubj.locator(
      'dateRangePickerAutoRefreshIntervalUnitSelect'
    );
    const toggleRefreshButton = this.page.testSubj.locator('dateRangePickerAutoRefreshToggle');

    const isPaused = (await toggleRefreshButton.getAttribute('aria-checked')) === 'false';
    if (isPaused) {
      await toggleRefreshButton.click();
    }

    await refreshIntervalInput.clear();
    await refreshIntervalInput.fill(interval.toString());
    await refreshIntervalUnitSelect.selectOption({ value: dateUnit });
    await refreshIntervalInput.press('Enter');

    // Close the panel
    await this.page.keyboard.press('Escape');
  }

  async waitToBeHidden() {
    await this.page.testSubj
      .locator('dateRangePickerCustomRangePanel')
      .waitFor({ state: 'hidden' });
  }
}
