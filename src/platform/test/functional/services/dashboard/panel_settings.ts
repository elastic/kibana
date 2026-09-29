/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { CommonlyUsed } from '../../page_objects/time_picker';

export function DashboardCustomizePanelProvider({ getService, getPageObject }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');

  return new (class DashboardCustomizePanel {
    public readonly FLYOUT_TEST_SUBJ = 'customizePanel';
    /** Flyouts that include the panel settings: customize panel, Lens and other edit flyouts */
    private readonly SETTINGS_FLYOUT_TEST_SUBJS = [
      this.FLYOUT_TEST_SUBJ,
      'customizeLens',
      'panelEditFlyout',
      'links--panelEditor--flyout',
      'createImageEmbeddableFlyout',
    ];

    private async findExistingTestSubject(testSubjs: string[]) {
      for (const testSubj of testSubjs) {
        if (await testSubjects.exists(testSubj, { timeout: 500 })) return testSubj;
      }
    }
    public readonly TOGGLE_TIME_RANGE_TEST_SUBJ = 'customizePanelShowCustomTimeRange';

    async expectCustomizePanelSettingsFlyoutOpen() {
      log.debug('expectCustomizePanelSettingsFlyoutOpen');
      await retry.try(async () => {
        if (!(await this.findExistingTestSubject(this.SETTINGS_FLYOUT_TEST_SUBJS))) {
          throw new Error('Panel settings flyout is not open');
        }
      });
    }

    async expectCustomizePanelSettingsFlyoutClosed() {
      log.debug('expectCustomizePanelSettingsFlyoutClosed');
      for (const testSubj of this.SETTINGS_FLYOUT_TEST_SUBJS) {
        await testSubjects.missingOrFail(testSubj);
      }
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
      await retry.try(async () => {
        if (!(await testSubjects.exists('superDatePickerQuickMenu'))) {
          const button = await this.findDatePickerQuickMenuButton();
          if (button) {
            await button.click();
          }
        }
        await testSubjects.existOrFail('superDatePickerQuickMenu');
      });
    }

    public async clickCommonlyUsedTimeRange(time: CommonlyUsed) {
      log.debug('clickCommonlyUsedTimeRange', time);
      const testSubj = `superDatePickerCommonlyUsed_${time}`;
      await retry.try(async () => {
        if (!(await testSubjects.exists(testSubj))) {
          await this.openDatePickerQuickMenu();
        }
        await testSubjects.click(testSubj);
      });
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
        const saveButton =
          (await this.findExistingTestSubject([
            'saveCustomizePanelButton',
            'panelEditFlyoutApplyButton',
            'applyFlyoutButton',
            'links--panelEditor--saveBtn',
            'imageEmbeddableEditorSave',
          ])) ?? 'saveCustomizePanelButton';
        await testSubjects.click(saveButton);
        await testSubjects.waitForDeleted(saveButton);
      });
    }

    public async clickCancelButton() {
      log.debug('clickCancelButton');
      await retry.try(async () => {
        const cancelButton =
          (await this.findExistingTestSubject([
            'cancelCustomizePanelButton',
            'panelEditFlyoutCancelButton',
            'cancelFlyoutButton',
            'links--panelEditor--closeBtn',
            'imageEmbeddableEditorCancel',
          ])) ?? 'cancelCustomizePanelButton';
        await testSubjects.click(cancelButton);
        await testSubjects.waitForDeleted(cancelButton);
      });
    }
  })();
}
