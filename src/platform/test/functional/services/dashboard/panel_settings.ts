/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import { FtrProviderContext } from '../../ftr_provider_context';
import { CommonlyUsed } from '../../page_objects/time_picker';

export function DashboardCustomizePanelProvider({ getService, getPageObject }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');

  return new (class DashboardCustomizePanel {
    public readonly FLYOUT_TEST_SUBJ = 'customizePanel';
    public readonly TOGGLE_TIME_RANGE_TEST_SUBJ = 'customizePanelShowCustomTimeRange';

    async expectCustomizePanelSettingsFlyoutOpen() {
      log.debug('expectCustomizePanelSettingsFlyoutOpen');
      await testSubjects.existOrFail(this.FLYOUT_TEST_SUBJ);
    }

    async expectCustomizePanelSettingsFlyoutClosed() {
      log.debug('expectCustomizePanelSettingsFlyoutClosed');
      await testSubjects.missingOrFail(this.FLYOUT_TEST_SUBJ);
    }

    async expectExistsCustomTimeRange() {
      log.debug('expectExistsCustomTimeRange');
      await testSubjects.existOrFail(this.TOGGLE_TIME_RANGE_TEST_SUBJ);
    }

    async expectMissingCustomTimeRange() {
      log.debug('expectMissingCustomTimeRange');
      await testSubjects.missingOrFail(this.TOGGLE_TIME_RANGE_TEST_SUBJ);
    }

    public async findCustomTimeRangeToggleButton(): Promise<WebElementWrapper> {
      log.debug('findCustomTimeRangeToggleButton');
      let button: WebElementWrapper | undefined;
      await retry.waitFor('custom time range toggle button', async () => {
        button = await testSubjects.find(this.TOGGLE_TIME_RANGE_TEST_SUBJ);
        return Boolean(button);
      });
      return button!;
    }

    public async enableCustomTimeRange() {
      log.debug('enableCustomTimeRange');
      const toggle = await this.findCustomTimeRangeToggleButton();

      await retry.try(async () => {
        if ((await toggle.getAttribute('aria-checked')) === 'false') {
          await toggle.click();
          await retry.waitForWithTimeout(
            'custom time range to be enabled',
            1000,
            async () => (await toggle.getAttribute('aria-checked')) === 'true'
          );
        }
      });

      await retry.waitFor('superDatePickerToggleQuickMenuButton to be present', async () => {
        return Boolean(await this.findDatePickerQuickMenuButton());
      });
    }

    public async disableCustomTimeRange() {
      log.debug('disableCustomTimeRange');
      const toggle = await this.findCustomTimeRangeToggleButton();

      await retry.try(async () => {
        if ((await toggle.getAttribute('aria-checked')) === 'true') {
          await toggle.click();
          await retry.waitForWithTimeout(
            'custom time range to be disabled',
            1000,
            async () => (await toggle.getAttribute('aria-checked')) === 'false'
          );
        }
      });
    }

    public async findFlyout() {
      log.debug('findFlyout');
      return await testSubjects.find(this.FLYOUT_TEST_SUBJ);
    }

    public async findFlyoutTestSubject(testSubject: string) {
      log.debug('findFlyoutTestSubject');
      const flyout = await this.findFlyout();
      return await flyout.findByCssSelector(`[data-test-subj="${testSubject}"]`);
    }

    public async findDatePickerQuickMenuButton() {
      log.debug('findDatePickerQuickMenuButton');
      return await this.findFlyoutTestSubject('superDatePickerToggleQuickMenuButton');
    }

    public async openDatePickerQuickMenu() {
      log.debug('openDatePickerQuickMenu');
      let button: WebElementWrapper | undefined;
      await retry.waitFor('superDatePickerToggleQuickMenuButton to be present', async () => {
        button = await this.findDatePickerQuickMenuButton();
        return Boolean(button);
      });
      if (button) {
        await button.click();
      }
    }

    public async clickCommonlyUsedTimeRange(time: CommonlyUsed) {
      log.debug('clickCommonlyUsedTimeRange', time);
      await testSubjects.click(`superDatePickerCommonlyUsed_${time}`);
    }

    public async clickToggleHidePanelTitle() {
      log.debug('clickToggleHidePanelTitle');
      await testSubjects.click('customEmbeddablePanelHideTitleSwitch');
    }

    public async getCustomPanelTitle() {
      log.debug('getCustomPanelTitle');
      return (await testSubjects.find('customEmbeddablePanelTitleInput')).getAttribute('value');
    }

    public async setCustomPanelTitle(customTitle: string) {
      log.debug('setCustomPanelTitle');
      await testSubjects.setValue('customEmbeddablePanelTitleInput', customTitle, {
        clearWithKeyboard: customTitle === '', // if clearing the title using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async resetCustomPanelTitle() {
      log.debug('resetCustomPanelTitle');
      await testSubjects.click('resetCustomEmbeddablePanelTitleButton');
    }

    public async getCustomPanelDescription() {
      log.debug('getCustomPanelDescription');
      return (await testSubjects.find('customEmbeddablePanelDescriptionInput')).getAttribute(
        'value'
      );
    }

    public async setCustomPanelDescription(customDescription: string) {
      log.debug('setCustomPanelDescription');
      await testSubjects.setValue('customEmbeddablePanelDescriptionInput', customDescription, {
        clearWithKeyboard: customDescription === '', // if clearing the description using the empty string as the new value, 'clearWithKeyboard' must be true; otherwise, false
      });
    }

    public async resetCustomPanelDescription() {
      log.debug('resetCustomPanelDescription');
      await testSubjects.click('resetCustomEmbeddablePanelDescriptionButton');
    }

    public async clickSaveButton() {
      log.debug('clickSaveButton');
      await retry.try(async () => {
        await toasts.dismissAll();
        await testSubjects.click('saveCustomizePanelButton');
        await testSubjects.waitForDeleted('saveCustomizePanelButton');
      });
    }

    public async clickCancelButton() {
      log.debug('clickCancelButton');
      await retry.try(async () => {
        await testSubjects.click('cancelCustomizePanelButton');
        await testSubjects.waitForDeleted('cancelCustomizePanelButton');
      });
    }
  })();
}
