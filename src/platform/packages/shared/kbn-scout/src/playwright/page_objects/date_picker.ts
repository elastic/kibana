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
  private readonly quickMenuButton;
  private readonly toggleRefreshButton;
  private readonly refreshIntervalInput;
  private readonly refreshIntervalUnitSelect;

  constructor(private readonly page: ScoutPage) {
    this.quickMenuButton = this.page.testSubj.locator('superDatePickerToggleQuickMenuButton');
    this.toggleRefreshButton = this.page.testSubj.locator('superDatePickerToggleRefreshButton');
    this.refreshIntervalInput = this.page.testSubj.locator('superDatePickerRefreshIntervalInput');
    this.refreshIntervalUnitSelect = this.page.testSubj.locator(
      'superDatePickerRefreshIntervalUnitsSelect'
    );
  }

  private async showStartEndTimes(containerLocator?: Locator) {
    const getTestSubjLocator = (selector: string) =>
      containerLocator
        ? containerLocator.getByTestId(selector)
        : this.page.testSubj.locator(selector);
    const getLocator = (selector: string) =>
      containerLocator ? containerLocator.locator(selector) : this.page.locator(selector);

    await getTestSubjLocator('superDatePickerToggleQuickMenuButton').waitFor();

    // Close any open suggestion lists that might block the date picker button
    const isSuggestionListVisible = await getLocator('div.kbnTypeahead').isVisible();
    if (isSuggestionListVisible) {
      await getTestSubjLocator('unifiedTabs_tabsBar').click();
      await getLocator('div.kbnTypeahead').waitFor({ state: 'hidden' });
    }

    // Initial check if show/end buttons are visible
    const showBtn = getTestSubjLocator('superDatePickerShowDatesButton');
    const endBtn = getTestSubjLocator('superDatePickerendDatePopoverButton');

    if (
      !((await showBtn.isVisible({ timeout: 2000 })) || (await endBtn.isVisible({ timeout: 2000 })))
    ) {
      // Reload loop only if initial fails
      await expect
        .poll(
          async () => {
            await this.page.reload();
            await getTestSubjLocator('superDatePickerToggleQuickMenuButton').waitFor();
            return (await showBtn.isVisible()) || (await endBtn.isVisible());
          },
          {
            timeout: 20000,
            intervals: [500], // Retry every 0.5s
          }
        )
        .toBe(true);
    }

    if (await showBtn.isVisible()) {
      // Click to show start/end time pickers
      await showBtn.click();
      await this.page.testSubj.locator('superDatePickerAbsoluteTab').waitFor();
      await this.page.testSubj.locator('superDatePickerstartDatePopoverButton').click();
    } else {
      await getTestSubjLocator('superDatePickerstartDatePopoverButton').waitFor();
    }
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
    const getTestSubjLocator = (selector: string) =>
      containerLocator
        ? containerLocator.getByTestId(selector)
        : this.page.testSubj.locator(selector);

    // we start with end date
    await getTestSubjLocator('superDatePickerendDatePopoverButton').click();
    await this.openAbsoluteTab();
    const inputFrom = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputFrom.clear();
    await inputFrom.fill(to);
    await this.page.testSubj.locator('parseAbsoluteDateFormat').click();
    await this.page.keyboard.press('Escape');
    // and later change start date
    await this.page.testSubj.locator('superDatePickerstartDatePopoverButton').click();
    await this.openAbsoluteTab();
    const inputTo = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputTo.clear();
    await inputTo.fill(from);
    await this.page.testSubj.locator('parseAbsoluteDateFormat').click();
    await this.page.keyboard.press('Escape');

    if (validateDates) {
      await expect(
        getTestSubjLocator('superDatePickerstartDatePopoverButton'),
        `Date picker 'start date' should be set correctly`
      ).toHaveText(from);
      await expect(
        getTestSubjLocator('superDatePickerendDatePopoverButton'),
        `Date picker 'end date' should be set correctly`
      ).toHaveText(to);
    }

    await getTestSubjLocator('querySubmitButton').click();
  }

  async setCommonlyUsedTime(option: string) {
    await this.quickMenuButton.click();
    const commonlyUsedOption = this.page.testSubj.locator(`superDatePickerCommonlyUsed_${option}`);
    await expect(commonlyUsedOption).toBeVisible();
    await commonlyUsedOption.click();
  }

  async setAbsoluteRange({ from, to }: { from: string; to: string }) {
    await this.showStartEndTimes();
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
    await this.showStartEndTimes(containerLocator);
    await this.typeAbsoluteRange({ from, to, validateDates: true, containerLocator });
  }

  async openAbsoluteTab() {
    // usually 2 matching elements exist, one in the popover and one hidden in the DOM
    const absoluteTab = this.page.testSubj
      .locator('superDatePickerAbsoluteTab')
      .filter({ visible: true });
    await expect(absoluteTab).toHaveCount(1);
    await absoluteTab.click();
  }

  async getTimeConfig(): Promise<{ start: string; end: string }> {
    await this.showStartEndTimes();
    const start = await this.page.testSubj.innerText('superDatePickerstartDatePopoverButton');
    const end = await this.page.testSubj.innerText('superDatePickerendDatePopoverButton');
    return { start, end };
  }

  async startAutoRefresh(interval: number, dateUnit: DateUnitSelector = DateUnitSelector.Seconds) {
    await this.quickMenuButton.click();
    // Check if refresh is already running
    const isPaused = (await this.toggleRefreshButton.getAttribute('aria-checked')) === 'false';
    if (isPaused) {
      await this.toggleRefreshButton.click();
    }
    // Set interval
    await this.refreshIntervalInput.clear();
    await this.refreshIntervalInput.fill(interval.toString());
    await this.refreshIntervalUnitSelect.selectOption({ value: dateUnit });
    await this.refreshIntervalInput.press('Enter');

    await this.quickMenuButton.click();
  }

  async waitToBeHidden() {
    await this.page.testSubj.locator('superDatePickerAbsoluteTab').waitFor({ state: 'hidden' });
  }
}
