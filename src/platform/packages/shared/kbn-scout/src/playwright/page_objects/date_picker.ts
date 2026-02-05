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

export enum DateUnitSelector {
  Seconds = 's',
  Minutes = 'm',
  Hours = 'h',
}

export class DatePicker {
  constructor(private readonly page: ScoutPage) {}

  private async showStartEndTimes() {
    await this.page.testSubj.waitForSelector('superDatePickerToggleQuickMenuButton');

    // Close any open suggestion lists that might block the date picker button
    const isSuggestionListVisible = await this.page.isVisible('div.kbnTypeahead');
    if (isSuggestionListVisible) {
      await this.page.testSubj.click('unifiedTabs_tabsBar');
      await this.page.locator('div.kbnTypeahead').waitFor({ state: 'hidden' });
    }

    // Initial check if show/end buttons are visible
    const showBtn = this.page.testSubj.locator('superDatePickerShowDatesButton');
    const endBtn = this.page.testSubj.locator('superDatePickerendDatePopoverButton');

    if (
      !((await showBtn.isVisible({ timeout: 2000 })) || (await endBtn.isVisible({ timeout: 2000 })))
    ) {
      // Reload loop only if initial fails
      await expect
        .poll(
          async () => {
            await this.page.reload();
            await this.page.testSubj.waitForSelector('superDatePickerToggleQuickMenuButton');
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
      await this.page.testSubj.waitForSelector('superDatePickerAbsoluteTab');
      await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    } else {
      await this.page.testSubj.waitForSelector('superDatePickerstartDatePopoverButton');
    }
  }

  async setAbsoluteRange({ from, to }: { from: string; to: string }) {
    await this.showStartEndTimes();
    // we start with end date
    await this.page.testSubj.click('superDatePickerendDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    const inputFrom = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputFrom.clear();
    await inputFrom.fill(to);
    await this.page.testSubj.click('parseAbsoluteDateFormat');
    await this.page.keyboard.press('Escape');
    // and later change start date
    await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    const inputTo = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputTo.clear();
    await inputTo.fill(from);
    await this.page.testSubj.click('parseAbsoluteDateFormat');
    await this.page.keyboard.press('Escape');

    await expect(
      this.page.testSubj.locator('superDatePickerstartDatePopoverButton'),
      `Date picker 'start date' should be set correctly`
    ).toHaveText(from);
    await expect(
      this.page.testSubj.locator('superDatePickerendDatePopoverButton'),
      `Date picker 'end date' should be set correctly`
    ).toHaveText(to);
    await this.page.testSubj.click('querySubmitButton');
  }

  async getTimeConfig(): Promise<{ start: string; end: string }> {
    await this.showStartEndTimes();
    const start = await this.page.testSubj.innerText('superDatePickerstartDatePopoverButton');
    const end = await this.page.testSubj.innerText('superDatePickerendDatePopoverButton');
    return { start, end };
  }

  async startAutoRefresh(interval: number, dateUnit: DateUnitSelector = DateUnitSelector.Seconds) {
    await this.page.testSubj.click('superDatePickerToggleQuickMenuButton');
    // Check if refresh is already running
    const toggleButton = this.page.testSubj.locator('superDatePickerToggleRefreshButton');
    const isPaused = (await toggleButton.getAttribute('aria-checked')) === 'false';
    if (isPaused) {
      await toggleButton.click();
    }
    // Set interval
    const intervalInput = this.page.testSubj.locator('superDatePickerRefreshIntervalInput');
    await intervalInput.clear();
    await intervalInput.fill(interval.toString());
    const timeUnit = this.page.testSubj.locator('superDatePickerRefreshIntervalUnitsSelect');
    await timeUnit.selectOption({ value: dateUnit });
    await intervalInput.press('Enter');

    await this.page.testSubj.click('superDatePickerToggleQuickMenuButton');
  }
}
