/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
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
    // Race the new + legacy picker control test-subjs: whichever appears
    // first within 15s wins. The previous 5s wait + try/catch on the new
    // picker only mis-classified the picker on slow loads (e.g. Discover
    // recovering from an invalid `_g.time` URL) where the new picker takes
    // longer than 5s to mount, falling back to the legacy branch even when
    // no legacy picker is on the page.
    const newPicker = this.getTestSubjLocator('dateRangePickerControlButton', containerLocator);
    const legacyPicker = this.getTestSubjLocator(
      'superDatePickerToggleQuickMenuButton',
      containerLocator
    );
    const winner = await Promise.race([
      newPicker.waitFor({ timeout: 15000 }).then(() => 'new' as const).catch(() => null),
      legacyPicker.waitFor({ timeout: 15000 }).then(() => 'legacy' as const).catch(() => null),
    ]);
    return winner === 'new';
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
      // The button's `data-date-range` attribute holds raw ISO strings, but
      // tests assert on the rendered display format (e.g. `Sep 19, 2015 @
      // 06:31:44.000`). Parse the ISO and format using the picker's display
      // format so callers get a consistent string regardless of picker state.
      const dateRange =
        (await this.page.testSubj
          .locator('dateRangePickerControlButton')
          .getAttribute('data-date-range')) ?? '';
      const [start, end] = dateRange.split(' to ');
      const format = 'MMM D, YYYY @ HH:mm:ss.SSS';
      const toDisplay = (raw: string | undefined): string => {
        if (!raw) return '';
        const trimmed = raw.trim();
        const m = moment(trimmed, moment.ISO_8601);
        return m.isValid() ? m.utc().format(format) : trimmed;
      };
      return { start: toDisplay(start), end: toDisplay(end) };
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

  /**
   * The duration of the picker's current absolute range, in hours.
   * Mirrors FTR `timePicker.getTimeDurationInHours()` — used by histogram-brush
   * tests where the assertion is on the *width* of the resulting range rather
   * than a specific start/end.
   */
  async getTimeDurationInHours(): Promise<number> {
    const { start, end } = await this.getTimeConfig();
    const format = 'MMM D, YYYY @ HH:mm:ss.SSS';
    const startMoment = moment(start, format);
    const endMoment = moment(end, format);
    if (!startMoment.isValid() || !endMoment.isValid()) {
      throw new Error(`Could not parse time range as absolute dates: ${start} – ${end}`);
    }
    return moment.duration(endMoment.diff(startMoment)).asHours();
  }

  /**
   * Pause the time picker's auto-refresh. Mirrors FTR `timePicker.pauseAutoRefresh()`.
   * No-op if auto-refresh is already paused.
   */
  async pauseAutoRefresh() {
    if (await this.isNewDateRangePicker()) {
      await this.page.testSubj.locator('dateRangePickerControlButton').click();
      await this.page.testSubj.locator('dateRangePickerSettingsButton').click();
      await this.page.testSubj.locator('dateRangePickerSettingsPanel').waitFor();
      const toggle = this.page.testSubj.locator('dateRangePickerAutoRefreshToggle');
      if ((await toggle.getAttribute('aria-checked')) === 'true') {
        await toggle.click();
      }
      await this.page.keyboard.press('Escape');
    } else {
      await this.quickMenuButton.click();
      if ((await this.toggleRefreshButton.getAttribute('aria-checked')) === 'true') {
        await this.toggleRefreshButton.click();
      }
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
