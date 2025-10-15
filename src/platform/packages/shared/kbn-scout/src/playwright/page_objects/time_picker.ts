/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class TimePicker {
  public readonly defaultStartTime = 'Sep 19, 2015 @ 06:31:44.000';
  public readonly defaultEndTime = 'Sep 23, 2015 @ 18:31:44.000';

  constructor(private readonly page: ScoutPage) {}

  private async showStartEndTimes() {
    await this.page.testSubj.waitForSelector('superDatePickerToggleQuickMenuButton', {
      timeout: 20000,
    });

    const isShowDatesButton = await this.page.testSubj.isVisible('superDatePickerShowDatesButton', {
      timeout: 50,
    });

    if (isShowDatesButton) {
      await this.page.testSubj.hover('superDatePickerShowDatesButton');
      await this.page.testSubj.click('superDatePickerShowDatesButton');
    }

    await this.page.testSubj.waitForSelector('superDatePickerstartDatePopoverButton', {
      timeout: 1000,
    });

    // Close the start date popover which opens automatically
    if (isShowDatesButton) {
      await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    }
  }

  async setDefaultAbsoluteRange() {
    await this.setAbsoluteRange(this.defaultStartTime, this.defaultEndTime);
  }

  async setAbsoluteRange(fromTime: string, toTime: string) {
    await this.showStartEndTimes();

    // Set end time
    await this.page.testSubj.click('superDatePickerendDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    await this.page.testSubj.click('superDatePickerAbsoluteDateInput');

    const endInput = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await endInput.clear();
    await endInput.fill(toTime);
    await endInput.press('Enter');

    await this.page.testSubj.click('superDatePickerendDatePopoverButton'); // close popover

    // Set start time
    await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    await this.page.testSubj.click('superDatePickerAbsoluteTab');
    await this.page.testSubj.click('superDatePickerAbsoluteDateInput');

    const startInput = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await startInput.clear();
    await startInput.fill(fromTime);
    await startInput.press('Enter');

    await this.page.keyboard.press('Escape');

    // Apply the time range
    const applyButtonExists = await this.page.testSubj.isVisible('superDatePickerApplyTimeButton', {
      timeout: 100,
    });

    if (applyButtonExists) {
      await this.page.testSubj.click('superDatePickerApplyTimeButton');
    } else {
      await this.page.testSubj.click('querySubmitButton');
    }

    await this.page.waitForLoadingIndicatorHidden();
  }

  async getTimeConfig(): Promise<{ start: string; end: string }> {
    await this.showStartEndTimes();
    const start = await this.page.testSubj.innerText('superDatePickerstartDatePopoverButton');
    const end = await this.page.testSubj.innerText('superDatePickerendDatePopoverButton');
    return { start, end };
  }

  async startAutoRefresh(intervalS: number = 5) {
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
    await intervalInput.fill(intervalS.toString());
    await intervalInput.press('Enter');

    await this.page.testSubj.click('superDatePickerToggleQuickMenuButton');
  }

  async pauseAutoRefresh() {
    await this.page.testSubj.click('superDatePickerToggleQuickMenuButton');

    const toggleButton = this.page.testSubj.locator('superDatePickerToggleRefreshButton');
    const isPaused = (await toggleButton.getAttribute('aria-checked')) === 'false';

    if (!isPaused) {
      await toggleButton.click();
    }

    await this.page.testSubj.click('superDatePickerToggleQuickMenuButton');
  }
}
