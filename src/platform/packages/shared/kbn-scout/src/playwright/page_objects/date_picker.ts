/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage, expect } from '..';

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

  private async showStartEndTimes() {
    // This first await makes sure the superDatePicker has loaded before we check for the ShowDatesButton
    await this.page.testSubj.waitForSelector('superDatePickerToggleQuickMenuButton', {
      timeout: 10000,
    });
    const isShowDateBtnVisible = await this.page.testSubj.isVisible(
      'superDatePickerShowDatesButton',
      {
        timeout: 5000,
      }
    );

    if (isShowDateBtnVisible) {
      await this.page.testSubj.click('superDatePickerShowDatesButton');
    }

    const isStartDatePopoverBtnVisible = await this.page.testSubj.isVisible(
      'superDatePickerstartDatePopoverButton',
      {
        timeout: 5000,
      }
    );

    if (isStartDatePopoverBtnVisible) {
      await this.page.testSubj.click('superDatePickerstartDatePopoverButton');
    }
  }

  async setCommonlyUsedTime(option: string) {
    await this.quickMenuButton.click();
    const commonlyUsedOption = this.page.testSubj.locator(`superDatePickerCommonlyUsed_${option}`);
    await expect(commonlyUsedOption).toBeVisible();
    await commonlyUsedOption.click();
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
    await this.page.testSubj.click('superDatePickerendDatePopoverButton');
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
}
