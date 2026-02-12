/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
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
  private readonly common = this.ctx.getPageObject('common');
  private readonly kibanaServer = this.ctx.getService('kibanaServer');

  private readonly quickSelectTimeMenuToggle = this.ctx.getService('menuToggle').create({
    name: 'QuickSelectTime Menu',
    menuTestSubject: 'superDatePickerQuickMenu',
    toggleButtonTestSubject: 'superDatePickerToggleQuickMenuButton',
  });

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
   * the provides a quicker way to set the timepicker to the default range, saves a few seconds
   */
  async setDefaultAbsoluteRangeViaUiSettings() {
    await this.kibanaServer.uiSettings.update({
      'timepicker:timeDefaults': `{ "from": "${this.defaultStartTimeUTC}", "to": "${this.defaultEndTimeUTC}"}`,
    });
  }

  async resetDefaultAbsoluteRangeViaUiSettings() {
    await this.kibanaServer.uiSettings.replace({});
  }

  private async getTimePickerPanel() {
    return await this.retry.try(async () => {
      return await this.find.byCssSelector('div.euiPopover__panel[data-popover-open]');
    });
  }

  private async waitPanelIsGone(panelElement: WebElementWrapper) {
    await this.find.waitForElementStale(panelElement);
  }

  public async timePickerExists() {
    return await this.testSubjects.exists('superDatePickerToggleQuickMenuButton');
  }

  /**
   * Sets commonly used time
   * @param option 'Today' | 'This_week' | 'Last_15 minutes' | 'Last_24 hours' ...
   */
  async setCommonlyUsedTime(option: CommonlyUsed | string) {
    await this.testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 5000 });
    await this.testSubjects.click('superDatePickerToggleQuickMenuButton');
    await this.testSubjects.exists(`superDatePickerCommonlyUsed_${option}`, { timeout: 5000 });
    await this.testSubjects.click(`superDatePickerCommonlyUsed_${option}`);
  }

  /**
   * Sets recently used time (including custom ranges)
   * @param option a custom recently used time range (example: "Sep 20, 2015 @ 00:00:00.000 to Sep 20, 2015 @ 23:50:13.253")
   */
  async setRecentlyUsedTime(option: string) {
    await this.testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 5000 });
    await this.testSubjects.click('superDatePickerToggleQuickMenuButton');
    const panel = await this.testSubjects.find('superDatePickerQuickMenu');
    const buttonByOptionText = await panel.findByXpath(`.//button[text()='${option}']`);
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

  private async showStartEndTimes() {
    // This first await makes sure the superDatePicker has loaded before we check for the ShowDatesButton
    await this.testSubjects.exists('superDatePickerToggleQuickMenuButton', { timeout: 20000 });
    await this.retry.tryForTime(5000, async () => {
      const isShowDatesButton = await this.testSubjects.exists('superDatePickerShowDatesButton', {
        timeout: 50,
      });
      if (isShowDatesButton) {
        await this.testSubjects.moveMouseTo('superDatePickerShowDatesButton');
        await this.testSubjects.click('superDatePickerShowDatesButton', 50);
      }
      await this.testSubjects.exists('superDatePickerstartDatePopoverButton', { timeout: 1000 });
      // Close the start date popover which opens automatically if `superDatePickerShowDatesButton` is clicked
      if (isShowDatesButton) {
        await this.testSubjects.click('superDatePickerstartDatePopoverButton');
      }
    });
  }

  /**
   * @param {String} fromTime MMM D, YYYY @ HH:mm:ss.SSS
   * @param {String} toTime MMM D, YYYY @ HH:mm:ss.SSS
   * @param {Boolean} force time picker force update, default is false
   */
  public async setAbsoluteRange(fromTime: string, toTime: string, force = false) {
    const start = Date.now();
    const stepStart = () => Date.now();
    const slowLog = (label: string, t: number) =>
      this.common.logSlowTiming(`timePicker.setAbsoluteRange ${label}`, t);
    if (!force) {
      const t0 = stepStart();
      const currentUrl = decodeURI(await this.browser.getCurrentUrl());
      slowLog('getCurrentUrl', t0);
      const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
      const startMoment = moment.utc(fromTime, DEFAULT_DATE_FORMAT).toISOString();
      const endMoment = moment.utc(toTime, DEFAULT_DATE_FORMAT).toISOString();
      if (currentUrl.includes(`time:(from:'${startMoment}',to:'${endMoment}'`)) {
        this.log.debug(
          `We already have the desired start (${fromTime}) and end (${toTime}) in the URL, returning from setAbsoluteRange`
        );
        this.common.logSlowTiming('timePicker.setAbsoluteRange skipped (already in URL)', start);
        return;
      }
    }
    this.log.debug(`Setting absolute range to ${fromTime} to ${toTime}`);
    const t1 = stepStart();
    await this.showStartEndTimes();
    slowLog('showStartEndTimes', t1);

    // set to time
    const t2 = stepStart();
    await this.retry.waitFor(`endDate is set to ${toTime}`, async () => {
      await this.testSubjects.click('superDatePickerendDatePopoverButton');
      await this.testSubjects.click('superDatePickerAbsoluteTab');
      await this.testSubjects.click('superDatePickerAbsoluteDateInput');
      await this.inputValue('superDatePickerAbsoluteDateInput', toTime);
      await this.testSubjects.click('superDatePickerendDatePopoverButton'); // close popover because sometimes browser can't find start input
      const actualToTime = await this.testSubjects.getVisibleText(
        'superDatePickerendDatePopoverButton'
      );
      this.log.debug(`Validating 'endDate' - expected: '${toTime}, actual: ${actualToTime}'`);
      return toTime === actualToTime;
    });
    slowLog('setEndDate', t2);

    // set from time
    const t3 = stepStart();
    await this.retry.waitFor(`startDate is set to ${fromTime}`, async () => {
      await this.testSubjects.click('superDatePickerstartDatePopoverButton');
      await this.testSubjects.click('superDatePickerAbsoluteTab');
      await this.testSubjects.click('superDatePickerAbsoluteDateInput');
      await this.inputValue('superDatePickerAbsoluteDateInput', fromTime);
      await this.browser.pressKeys(this.browser.keys.ESCAPE);
      const actualFromTime = await this.testSubjects.getVisibleText(
        'superDatePickerstartDatePopoverButton'
      );
      this.log.debug(`Validating 'startDate' - expected: '${fromTime}, actual: ${actualFromTime}'`);
      return fromTime === actualFromTime;
    });
    slowLog('setStartDate', t3);

    const t4 = stepStart();
    await this.retry.waitFor('Timepicker popover to close', async () => {
      await this.browser.pressKeys(this.browser.keys.ESCAPE);
      return !(await this.testSubjects.exists('superDatePickerAbsoluteDateInput', { timeout: 50 }));
    });
    slowLog('waitForPopoverClose', t4);

    const superDatePickerApplyButtonExists = await this.testSubjects.exists(
      'superDatePickerApplyTimeButton',
      { timeout: 100 }
    );
    if (superDatePickerApplyButtonExists) {
      // Timepicker is in top nav
      // Click super date picker apply button to apply time range
      const t5 = stepStart();
      await this.testSubjects.click('superDatePickerApplyTimeButton');
      slowLog('applyTimeRange applyButton', t5);
    } else {
      // Timepicker is embedded in query bar
      // click query bar submit button to apply time range
      const t6 = stepStart();
      await this.testSubjects.click('querySubmitButton');
      slowLog('applyTimeRange querySubmit', t6);
    }

    const t7 = stepStart();
    await this.header.awaitGlobalLoadingIndicatorHidden();
    slowLog('awaitGlobalLoadingIndicatorHidden', t7);
    this.common.logSlowTiming('timePicker.setAbsoluteRange', start);
  }

  public async isOff() {
    return await this.find.existsByCssSelector('.euiAutoRefresh .euiFormControlLayout-readOnly');
  }

  public async getRefreshConfig(keepQuickSelectOpen = false) {
    await this.quickSelectTimeMenuToggle.open();
    const interval = await this.testSubjects.getAttribute(
      'superDatePickerRefreshIntervalInput',
      'value'
    );

    let selectedUnit;
    const select = await this.testSubjects.find('superDatePickerRefreshIntervalUnitsSelect');
    const options = await this.find.allDescendantDisplayedByCssSelector('option', select);
    await Promise.all(
      options.map(async (optionElement) => {
        const isSelected = await optionElement.isSelected();
        if (isSelected) {
          selectedUnit = await optionElement.getVisibleText();
        }
      })
    );

    const toggleButtonChecked = await this.testSubjects.getAttribute(
      'superDatePickerToggleRefreshButton',
      'aria-checked'
    );
    if (!keepQuickSelectOpen) {
      await this.quickSelectTimeMenuToggle.close();
    }

    return {
      interval,
      units: selectedUnit,
      isPaused: toggleButtonChecked === 'true' ? false : true,
    };
  }

  public async getTimeConfig() {
    await this.showStartEndTimes();
    const start = await this.testSubjects.getVisibleText('superDatePickerstartDatePopoverButton');
    const end = await this.testSubjects.getVisibleText('superDatePickerendDatePopoverButton');
    return {
      start,
      end,
    };
  }

  public async getShowDatesButtonText() {
    const button = await this.testSubjects.find('superDatePickerShowDatesButton');
    const text = await button.getVisibleText();
    return text;
  }

  public async getTimeDurationForSharing() {
    return await this.testSubjects.getAttribute(
      'dataSharedTimefilterDuration',
      'data-shared-timefilter-duration'
    );
  }

  public async getTimeConfigAsAbsoluteTimes() {
    await this.showStartEndTimes();

    // get to time
    await this.testSubjects.click('superDatePickerendDatePopoverButton');
    const panel = await this.getTimePickerPanel();
    await this.testSubjects.click('superDatePickerAbsoluteTab');
    const end = await this.testSubjects.getAttribute('superDatePickerAbsoluteDateInput', 'value');

    // Wait until closing popover again to avoid https://github.com/elastic/eui/issues/5619
    await this.common.sleep(2000);

    // get from time
    await this.testSubjects.click('superDatePickerstartDatePopoverButton');
    await this.waitPanelIsGone(panel);
    await this.testSubjects.click('superDatePickerAbsoluteTab');
    const start = await this.testSubjects.getAttribute('superDatePickerAbsoluteDateInput', 'value');

    return {
      start,
      end,
    };
  }

  public async getTimeDurationInHours() {
    const DEFAULT_DATE_FORMAT = 'MMM D, YYYY @ HH:mm:ss.SSS';
    const { start, end } = await this.getTimeConfigAsAbsoluteTimes();
    const startMoment = moment(start, DEFAULT_DATE_FORMAT);
    const endMoment = moment(end, DEFAULT_DATE_FORMAT);
    return moment.duration(endMoment.diff(startMoment)).asHours();
  }

  public async startAutoRefresh(intervalS = 3) {
    await this.quickSelectTimeMenuToggle.open();
    const refreshConfig = await this.getRefreshConfig(true);

    if (refreshConfig.isPaused) {
      this.log.debug('start auto refresh');
      await this.testSubjects.click('superDatePickerToggleRefreshButton');
    }

    await this.retry.waitFor('auto refresh to be set correctly', async () => {
      await this.inputValue('superDatePickerRefreshIntervalInput', intervalS.toString());
      return (
        (await this.testSubjects.getAttribute('superDatePickerRefreshIntervalInput', 'value')) ===
        intervalS.toString()
      );
    });

    await this.quickSelectTimeMenuToggle.close();
  }

  public async pauseAutoRefresh() {
    this.log.debug('pauseAutoRefresh');
    const refreshConfig = await this.getRefreshConfig(true);

    if (!refreshConfig.isPaused) {
      this.log.debug('pause auto refresh');
      await this.testSubjects.click('superDatePickerToggleRefreshButton');
    }

    await this.quickSelectTimeMenuToggle.close();
  }

  public async resumeAutoRefresh() {
    this.log.debug('resumeAutoRefresh');
    const refreshConfig = await this.getRefreshConfig(true);
    if (refreshConfig.isPaused) {
      this.log.debug('resume auto refresh');
      await this.testSubjects.click('superDatePickerToggleRefreshButton');
    }

    await this.quickSelectTimeMenuToggle.close();
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
