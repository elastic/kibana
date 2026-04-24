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

  /**
   * Detects whether the page is using the new DateRangePicker or the legacy
   * EuiSuperDatePicker. Not cached because the lazy page object proxy lacks a
   * `set` trap, so instance property writes through the proxy are lost.
   *
   * When a containerLocator is provided, the detection is scoped to that
   * container (useful when the only DateRangePicker lives inside a panel).
   */
  private async isNewDateRangePicker(containerLocator?: Locator): Promise<boolean> {
    try {
      await this.getTestSubjLocator('dateRangePickerControlButton', containerLocator).waitFor({
        timeout: 5000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private getTestSubjLocator(selector: string, containerLocator?: Locator) {
    return containerLocator
      ? containerLocator.getByTestId(selector)
      : this.page.testSubj.locator(selector);
  }

  // ---------------------------------------------------------------------------
  // Legacy EuiSuperDatePicker helpers
  // ---------------------------------------------------------------------------

  private async showStartEndTimes(containerLocator?: Locator) {
    const getTestSubjLocator = (selector: string) =>
      this.getTestSubjLocator(selector, containerLocator);
    const getLocator = (selector: string) =>
      containerLocator ? containerLocator.locator(selector) : this.page.locator(selector);

    await getTestSubjLocator('superDatePickerToggleQuickMenuButton').waitFor();

    // Close any open suggestion lists that might block the date picker button
    const isSuggestionListVisible = await getLocator('div.kbnTypeahead').isVisible();
    if (isSuggestionListVisible) {
      await getTestSubjLocator('unifiedTabs_tabsBar').click();
      await getLocator('div.kbnTypeahead').waitFor({ state: 'hidden' });
    }

    const showBtn = getTestSubjLocator('superDatePickerShowDatesButton');

    if (await showBtn.isVisible({ timeout: 2000 })) {
      // Click to show start/end time pickers
      await showBtn.click();
      await this.page.testSubj.locator('superDatePickerAbsoluteTab').waitFor();
      await this.page.testSubj.locator('superDatePickerstartDatePopoverButton').click();
    } else {
      await getTestSubjLocator('superDatePickerstartDatePopoverButton').waitFor();
    }
  }

  private async openAbsoluteTab() {
    // Usually 2 matching elements exist: one visible in the popover and one hidden in the DOM.
    const absoluteTab = this.page.testSubj
      .locator('superDatePickerAbsoluteTab')
      .filter({ visible: true });
    await expect(absoluteTab).toHaveCount(1);
    await absoluteTab.click();
  }

  private async typeAbsoluteRangeLegacy({
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
      this.getTestSubjLocator(selector, containerLocator);

    // we start with end date
    await getTestSubjLocator('superDatePickerendDatePopoverButton').click();
    await this.openAbsoluteTab();
    const inputFrom = this.page.testSubj.locator('superDatePickerAbsoluteDateInput');
    await inputFrom.clear();
    await inputFrom.fill(to);
    await this.page.testSubj.locator('parseAbsoluteDateFormat').click();
    await this.page.keyboard.press('Escape');
    // and later change start date
    await getTestSubjLocator('superDatePickerstartDatePopoverButton').click();
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

  // ---------------------------------------------------------------------------
  // New DateRangePicker helpers
  // ---------------------------------------------------------------------------

  private async ensurePickerVisible(containerLocator?: Locator) {
    const controlButton = this.getTestSubjLocator('dateRangePickerControlButton', containerLocator);
    await controlButton.waitFor();

    // Close any open suggestion lists that might block the date picker button
    const getLocator = (selector: string) =>
      containerLocator ? containerLocator.locator(selector) : this.page.locator(selector);
    const isSuggestionListVisible = await getLocator('div.kbnTypeahead').isVisible();
    if (isSuggestionListVisible) {
      await this.getTestSubjLocator('unifiedTabs_tabsBar', containerLocator).click();
      await getLocator('div.kbnTypeahead').waitFor({ state: 'hidden' });
    }
  }

  private async openCustomRangePanel(containerLocator?: Locator) {
    await this.ensurePickerVisible(containerLocator);
    // Click the control button scoped to the container
    await this.getTestSubjLocator('dateRangePickerControlButton', containerLocator).click();
    // The dialog/popover renders as a portal at the page root, not inside the container,
    // so dialog elements must be found at the page level.
    await this.page.testSubj.locator('dateRangePickerCustomRangeNavItem').click();
    await this.page.testSubj.locator('dateRangePickerCustomRangePanel').waitFor();
  }

  private async setDatePart(side: 'Start' | 'End', value: string) {
    // Dialog elements render as a portal at the page root
    await this.page.testSubj.locator(`dateRangePicker${side}AbsoluteTab`).click();
    const input = this.page.testSubj.locator(`dateRangePicker${side}AbsoluteInput`);
    await input.clear();
    await input.fill(value);
  }

  private async typeAbsoluteRangeNewPicker({
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
    // Dialog elements render as a portal at the page root
    await this.setDatePart('Start', from);
    await this.setDatePart('End', to);
    await this.page.testSubj.locator('dateRangePickerCustomRangeApplyButton').click();

    if (validateDates) {
      const controlButton = this.getTestSubjLocator(
        'dateRangePickerControlButton',
        containerLocator
      );
      // Note: data-date-range stores ISO 8601 strings (e.g. "2025-01-01T00:00:00.000Z"),
      // not the human-readable format passed as `from`/`to`. We assert visibility only
      // to confirm the picker updated without risking a format-mismatch failure.
      await expect(
        controlButton,
        `Date picker should reflect the updated time range`
      ).toBeVisible();
    }

    await this.getTestSubjLocator('querySubmitButton', containerLocator).click();
  }

  // ---------------------------------------------------------------------------
  // Public API (dual-path)
  // ---------------------------------------------------------------------------

  async setCommonlyUsedTime(option: string) {
    if (await this.isNewDateRangePicker()) {
      await this.page.testSubj.locator('dateRangePickerControlButton').click();
      await this.page.testSubj.locator('dateRangePickerMainPanel').waitFor();
      const presetItem = this.page.testSubj.locator(`dateRangePickerPresetItem-${option}`);
      await expect(presetItem).toBeVisible();
      await presetItem.click();
    } else {
      await this.quickMenuButton.click();
      const commonlyUsedOption = this.page.testSubj.locator(
        `superDatePickerCommonlyUsed_${option}`
      );
      await expect(commonlyUsedOption).toBeVisible();
      await commonlyUsedOption.click();
    }
  }

  async setAbsoluteRange({ from, to }: { from: string; to: string }) {
    if (await this.isNewDateRangePicker()) {
      await this.openCustomRangePanel();
      await this.typeAbsoluteRangeNewPicker({ from, to, validateDates: true });
    } else {
      await this.showStartEndTimes();
      await this.typeAbsoluteRangeLegacy({ from, to, validateDates: true });
    }
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
    if (await this.isNewDateRangePicker(containerLocator)) {
      await this.openCustomRangePanel(containerLocator);
      await this.typeAbsoluteRangeNewPicker({
        from,
        to,
        validateDates: true,
        containerLocator,
      });
    } else {
      await this.showStartEndTimes(containerLocator);
      await this.typeAbsoluteRangeLegacy({
        from,
        to,
        validateDates: true,
        containerLocator,
      });
    }
  }

  /** @deprecated Use {@link setAbsoluteRangeInRootContainer} instead. */
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
    if (await this.isNewDateRangePicker(containerLocator)) {
      await this.openCustomRangePanel(containerLocator);
      await this.typeAbsoluteRangeNewPicker({ from, to, validateDates, containerLocator });
    } else {
      await this.showStartEndTimes(containerLocator);
      await this.typeAbsoluteRangeLegacy({ from, to, validateDates, containerLocator });
    }
  }

  async getTimeConfig(): Promise<{ start: string; end: string }> {
    if (await this.isNewDateRangePicker()) {
      const dateRange =
        (await this.page.testSubj
          .locator('dateRangePickerControlButton')
          .getAttribute('data-date-range')) ?? '';
      const [start, end] = dateRange.split(' to ');
      return { start: start?.trim() ?? '', end: end?.trim() ?? '' };
    }
    await this.showStartEndTimes();
    const start = await this.page.testSubj.innerText('superDatePickerstartDatePopoverButton');
    const end = await this.page.testSubj.innerText('superDatePickerendDatePopoverButton');
    return { start, end };
  }

  async startAutoRefresh(interval: number, dateUnit: DateUnitSelector = DateUnitSelector.Seconds) {
    if (await this.isNewDateRangePicker()) {
      await this.page.testSubj.locator('dateRangePickerControlButton').click();
      await this.page.testSubj.locator('dateRangePickerSettingsButton').click();
      await this.page.testSubj.locator('dateRangePickerSettingsPanel').waitFor();

      const toggle = this.page.testSubj.locator('dateRangePickerAutoRefreshToggle');
      const isPaused = (await toggle.getAttribute('aria-checked')) !== 'true';
      if (isPaused) {
        await toggle.click();
      }

      const countInput = this.page.testSubj.locator('dateRangePickerAutoRefreshIntervalCount');
      await countInput.clear();
      await countInput.fill(interval.toString());
      await this.page.testSubj
        .locator('dateRangePickerAutoRefreshIntervalUnit')
        .selectOption({ value: dateUnit });

      await this.page.keyboard.press('Escape');
    } else {
      await this.quickMenuButton.click();
      const isPaused = (await this.toggleRefreshButton.getAttribute('aria-checked')) === 'false';
      if (isPaused) {
        await this.toggleRefreshButton.click();
      }
      await this.refreshIntervalInput.clear();
      await this.refreshIntervalInput.fill(interval.toString());
      await this.refreshIntervalUnitSelect.selectOption({ value: dateUnit });
      await this.refreshIntervalInput.press('Enter');
      await this.quickMenuButton.click();
    }
  }

  async waitToBeHidden() {
    if (await this.isNewDateRangePicker()) {
      await this.page.testSubj
        .locator('dateRangePickerCustomRangePanel')
        .waitFor({ state: 'hidden' });
    } else {
      await this.page.testSubj.locator('superDatePickerAbsoluteTab').waitFor({ state: 'hidden' });
    }
  }
}
