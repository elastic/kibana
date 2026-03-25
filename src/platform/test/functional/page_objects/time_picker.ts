/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Time picker page object for pages that render the Unified Search query bar,
 * which uses kbn-date-range-picker. For pages that still render EuiSuperDatePicker
 * directly (not via Unified Search), use `LegacyTimePickerPageObject` (legacy_time_picker.ts).
 */

import moment from 'moment';
import { FtrService } from '../ftr_provider_context';

export type CommonlyUsed =
  | 'Today'
  | 'This_week'
  | 'Last_15 minutes'
  | 'Last_30 minutes'
  | 'Last_1 hour'
  | 'Last_24 hours'
  | 'Last_7 days'
  | 'Last_30 days'
  | 'Last_90 days'
  | 'Last_1 year';

export class TimePickerPageObject extends FtrService {
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly browser = this.ctx.getService('browser');
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly header = this.ctx.getPageObject('header');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  public readonly defaultStartTime = 'Sep 19, 2015 @ 06:31:44.000';
  public readonly defaultEndTime = 'Sep 23, 2015 @ 18:31:44.000';
  public readonly defaultStartTimeUTC = '2015-09-19T06:31:44.000Z';
  public readonly defaultEndTimeUTC = '2015-09-23T18:31:44.000Z';

  async setDefaultAbsoluteRange() {
    await this.setAbsoluteRange(this.defaultStartTime, this.defaultEndTime);
  }

  async waitForNoDataPopover() {
    await this.testSubjects.find('noDataPopoverDismissButton');
  }

  async ensureHiddenNoDataPopover() {
    const isVisible = await this.testSubjects.exists('noDataPopoverDismissButton', {
      timeout: 100,
    });
    if (isVisible) {
      await this.testSubjects.click('noDataPopoverDismissButton');
      await this.testSubjects.waitForDeleted('noDataPopoverDismissButton');
    }
  }

  /**
   * Provides a quicker way to set the timepicker to the default range via API, saves a few seconds.
   */
  async setDefaultAbsoluteRangeViaUiSettings() {
    await this.kibanaServer.uiSettings.update({
      'timepicker:timeDefaults': `{ "from": "${this.defaultStartTimeUTC}", "to": "${this.defaultEndTimeUTC}"}`,
    });
  }

  async resetDefaultAbsoluteRangeViaUiSettings() {
    await this.kibanaServer.uiSettings.replace({});
  }

  public async timePickerExists() {
    return await this.testSubjects.exists('dateRangePickerControlButton');
  }

  /**
   * Sets a commonly used preset time range.
   * @param option 'Today' | 'This_week' | 'Last_15 minutes' | 'Last_24 hours' ...
   */
  async setCommonlyUsedTime(option: CommonlyUsed | string) {
    await this.testSubjects.exists('dateRangePickerControlButton', { timeout: 5000 });
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.exists('dateRangePickerMainPanel', { timeout: 5000 });
    // kbn-date-range-picker formats preset test subjects by replacing spaces with underscores
    const testSubj = `dateRangePickerPresetItem-${option.replace(/\s+/g, '_')}`;
    await this.testSubjects.exists(testSubj, { timeout: 5000 });
    await this.testSubjects.click(testSubj);
  }

  /**
   * Sets a recently used time range by its display label.
   * @param option display label of the recently used range (e.g. "Sep 20, 2015 @ 00:00:00.000 → Sep 20, 2015 @ 23:50:13.253")
   */
  async setRecentlyUsedTime(option: string) {
    await this.testSubjects.exists('dateRangePickerControlButton', { timeout: 5000 });
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.exists('dateRangePickerMainPanel', { timeout: 5000 });
    await this.testSubjects.click('dateRangePickerRecentTab');
    const panel = await this.testSubjects.find('dateRangePickerMainPanel');
    const buttonByOptionText = await panel.findByXpath(`.//button[contains(., '${option}')]`);
    await buttonByOptionText?.click();
  }

  public async inputValue(dataTestSubj: string, value: string) {
    if (this.browser.isFirefox) {
      const input = await this.testSubjects.find(dataTestSubj);
      await input.clearValue();
      await input.type(value);
    } else {
      await this.testSubjects.setValue(dataTestSubj, value);
    }
    await this.testSubjects.pressEnter(dataTestSubj);
  }

  /**
   * Clicks the Absolute tab inside a dateRangePicker{Start|End}DatePart container
   * and fills in the given value.
   */
  private async setDatePartAbsoluteValue(datePartTestSubj: string, value: string) {
    const container = await this.testSubjects.find(datePartTestSubj);
    const absoluteBtn = await container.findByXpath('.//button[normalize-space()="Absolute"]');
    await absoluteBtn.click();
    const input = await container.findByCssSelector('input[type="text"]');
    await input.clearValue();
    await input.type(value);
    await input.pressKeys(this.browser.keys.ENTER);
  }

  /**
   * @param {String} fromTime MMM D, YYYY @ HH:mm:ss.SSS
   * @param {String} toTime MMM D, YYYY @ HH:mm:ss.SSS
   * @param {Boolean} force time picker force update, default is false
   */
  public async setAbsoluteRange(fromTime: string, toTime: string, force = false) {
    if (!force) {
      const currentUrl = decodeURI(await this.browser.getCurrentUrl());
      const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
      const startMoment = moment.utc(fromTime, DEFAULT_DATE_FORMAT).toISOString();
      const endMoment = moment.utc(toTime, DEFAULT_DATE_FORMAT).toISOString();
      if (currentUrl.includes(`time:(from:'${startMoment}',to:'${endMoment}'`)) {
        this.log.debug(
          `We already have the desired start (${fromTime}) and end (${toTime}) in the URL, returning from setAbsoluteRange`
        );
        return;
      }
    }
    this.log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);

    await this.testSubjects.exists('dateRangePickerControlButton', { timeout: 20000 });
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerCustomRangeNavItem');
    await this.testSubjects.exists('dateRangePickerCustomRangePanel', { timeout: 5000 });

    // set end date
    await this.retry.waitFor(`endDate is set to ${toTime}`, async () => {
      await this.setDatePartAbsoluteValue('dateRangePickerEndDatePart', toTime);
      const container = await this.testSubjects.find('dateRangePickerEndDatePart');
      const input = await container.findByCssSelector('input[type="text"]');
      const actualToTime = (await input.getAttribute('value')) ?? '';
      this.log.debug(`Validating 'endDate' - expected: '${toTime}', actual: '${actualToTime}'`);
      return toTime === actualToTime;
    });

    // set start date
    await this.retry.waitFor(`startDate is set to ${fromTime}`, async () => {
      await this.setDatePartAbsoluteValue('dateRangePickerStartDatePart', fromTime);
      const container = await this.testSubjects.find('dateRangePickerStartDatePart');
      const input = await container.findByCssSelector('input[type="text"]');
      const actualFromTime = (await input.getAttribute('value')) ?? '';
      this.log.debug(
        `Validating 'startDate' - expected: '${fromTime}', actual: '${actualFromTime}'`
      );
      return fromTime === actualFromTime;
    });

    await this.testSubjects.click('dateRangePickerCustomRangeApplyButton');
    await this.testSubjects.click('querySubmitButton');
    await this.header.awaitGlobalLoadingIndicatorHidden();
  }

  /**
   * Returns whether auto-refresh is currently disabled (toggle is off or settings panel is unavailable).
   */
  public async isOff() {
    const exists = await this.testSubjects.exists('dateRangePickerAutoRefreshToggle', {
      timeout: 100,
    });
    if (!exists) return true;
    const checked = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshToggle',
      'aria-checked'
    );
    return checked !== 'true';
  }

  public async getRefreshConfig(keepPanelOpen = false) {
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerSettingsButton');
    await this.testSubjects.exists('dateRangePickerSettingsPanel', { timeout: 5000 });

    const interval = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshIntervalCount',
      'value'
    );

    let selectedUnit;
    const select = await this.testSubjects.find('dateRangePickerAutoRefreshIntervalUnit');
    const options = await this.find.allDescendantDisplayedByCssSelector('option', select);
    await Promise.all(
      options.map(async (optionElement) => {
        const isSelected = await optionElement.isSelected();
        if (isSelected) {
          selectedUnit = await optionElement.getVisibleText();
        }
      })
    );

    const toggleChecked = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshToggle',
      'aria-checked'
    );

    if (!keepPanelOpen) {
      await this.browser.pressKeys(this.browser.keys.ESCAPE);
    }

    return {
      interval,
      units: selectedUnit,
      isPaused: toggleChecked === 'true' ? false : true,
    };
  }

  /**
   * Returns the current time range as displayed in the control button.
   * Splits the combined "start → end" display text into separate start/end strings.
   */
  public async getTimeConfig() {
    await this.testSubjects.exists('dateRangePickerControlButton', { timeout: 5000 });
    await this.testSubjects.click('dateRangePickerControlButton');
    const input = await this.testSubjects.find('dateRangePickerInput');
    const value = (await input.getAttribute('value')) ?? '';
    await this.browser.pressKeys(this.browser.keys.ESCAPE);
    const [start, end] = value.split(' → ');
    return {
      start: (start ?? '').trim(),
      end: (end ?? '').trim(),
    };
  }

  public async getTimeDurationForSharing() {
    return await this.testSubjects.getAttribute(
      'dataSharedTimefilterDuration',
      'data-shared-timefilter-duration'
    );
  }

  /**
   * Returns the current absolute start/end times by opening the custom range panel
   * and reading the Absolute tab inputs directly.
   */
  public async getTimeConfigAsAbsoluteTimes() {
    await this.testSubjects.exists('dateRangePickerControlButton', { timeout: 5000 });
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerCustomRangeNavItem');
    await this.testSubjects.exists('dateRangePickerCustomRangePanel', { timeout: 5000 });

    // read end date
    const endPart = await this.testSubjects.find('dateRangePickerEndDatePart');
    const endAbsBtn = await endPart.findByXpath('.//button[normalize-space()="Absolute"]');
    await endAbsBtn.click();
    const endInput = await endPart.findByCssSelector('input[type="text"]');
    const end = (await endInput.getAttribute('value')) ?? '';

    // read start date
    const startPart = await this.testSubjects.find('dateRangePickerStartDatePart');
    const startAbsBtn = await startPart.findByXpath('.//button[normalize-space()="Absolute"]');
    await startAbsBtn.click();
    const startInput = await startPart.findByCssSelector('input[type="text"]');
    const start = (await startInput.getAttribute('value')) ?? '';

    await this.browser.pressKeys(this.browser.keys.ESCAPE);

    return { start, end };
  }

  public async getTimeDurationInHours() {
    const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
    const { start, end } = await this.getTimeConfigAsAbsoluteTimes();
    const startMoment = moment(start, DEFAULT_DATE_FORMAT);
    const endMoment = moment(end, DEFAULT_DATE_FORMAT);
    return moment.duration(endMoment.diff(startMoment)).asHours();
  }

  public async startAutoRefresh(intervalS = 3) {
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerSettingsButton');
    await this.testSubjects.exists('dateRangePickerSettingsPanel', { timeout: 5000 });

    const toggleChecked = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshToggle',
      'aria-checked'
    );
    if (toggleChecked !== 'true') {
      this.log.debug('start auto refresh');
      await this.testSubjects.click('dateRangePickerAutoRefreshToggle');
    }

    await this.retry.waitFor('auto refresh interval to be set correctly', async () => {
      const input = await this.testSubjects.find('dateRangePickerAutoRefreshIntervalCount');
      await input.clearValue();
      await input.type(intervalS.toString());
      await input.pressKeys(this.browser.keys.ENTER);
      return (
        (await this.testSubjects.getAttribute(
          'dateRangePickerAutoRefreshIntervalCount',
          'value'
        )) === intervalS.toString()
      );
    });

    await this.browser.pressKeys(this.browser.keys.ESCAPE);
  }

  public async pauseAutoRefresh() {
    this.log.debug('pauseAutoRefresh');
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerSettingsButton');
    await this.testSubjects.exists('dateRangePickerSettingsPanel', { timeout: 5000 });

    const toggleChecked = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshToggle',
      'aria-checked'
    );
    if (toggleChecked === 'true') {
      this.log.debug('pause auto refresh');
      await this.testSubjects.click('dateRangePickerAutoRefreshToggle');
    }

    await this.browser.pressKeys(this.browser.keys.ESCAPE);
  }

  public async resumeAutoRefresh() {
    this.log.debug('resumeAutoRefresh');
    await this.testSubjects.click('dateRangePickerControlButton');
    await this.testSubjects.click('dateRangePickerSettingsButton');
    await this.testSubjects.exists('dateRangePickerSettingsPanel', { timeout: 5000 });

    const toggleChecked = await this.testSubjects.getAttribute(
      'dateRangePickerAutoRefreshToggle',
      'aria-checked'
    );
    if (toggleChecked !== 'true') {
      this.log.debug('resume auto refresh');
      await this.testSubjects.click('dateRangePickerAutoRefreshToggle');
    }

    await this.browser.pressKeys(this.browser.keys.ESCAPE);
  }

  public async setHistoricalDataRange() {
    await this.setDefaultAbsoluteRange();
  }

  public async setDefaultDataRange() {
    const fromTime = 'Jan 1, 2018 @ 00:00:00.000';
    const toTime = 'Apr 13, 2018 @ 00:00:00.000';
    await this.setAbsoluteRange(fromTime, toTime);
  }

  public async setLogstashDataRange() {
    const fromTime = 'Apr 9, 2018 @ 00:00:00.000';
    const toTime = 'Apr 13, 2018 @ 00:00:00.000';
    await this.setAbsoluteRange(fromTime, toTime);
  }
}
