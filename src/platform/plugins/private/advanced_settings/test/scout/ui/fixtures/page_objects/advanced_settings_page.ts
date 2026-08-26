/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export class AdvancedSettingsPage {
  constructor(private readonly page: ScoutPage) {}

  async waitForPageLoad() {
    await this.page.testSubj.locator('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async getAdvancedSettingValue(settingName: string) {
    return this.page.testSubj.locator(`management-settings-editField-${settingName}`).inputValue();
  }

  async setAdvancedSettingsSelect(settingName: string, value: string) {
    const select = this.page.testSubj.locator(`management-settings-editField-${settingName}`);
    await select.selectOption(value);
    await this.page.testSubj.locator('settings-save-button').click();
    await this.page.testSubj.locator('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async setAdvancedSettingsInput(settingName: string, value: string) {
    const field = this.page.testSubj.locator(`management-settings-editField-${settingName}`);
    await field.clear();
    await field.fill(value);
    await this.page.testSubj.locator('settings-save-button').click();
    await this.page.testSubj.locator('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async clearAdvancedSetting(settingName: string) {
    await this.page.testSubj.locator(`management-settings-resetField-${settingName}`).click();
    await this.page.testSubj.locator('settings-save-button').click();
    await this.page.testSubj.locator('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async toggleAdvancedSettingCheckbox(settingName: string) {
    await this.page.testSubj.locator(`management-settings-editField-${settingName}`).click();
    await this.page.testSubj.locator('settings-save-button').click();
    await this.page.testSubj.locator('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async getAdvancedSettingCheckboxValue(settingName: string) {
    const ariaChecked = await this.page.testSubj
      .locator(`management-settings-editField-${settingName}`)
      .getAttribute('aria-checked');
    return ariaChecked === 'true';
  }

  async isSettingDisabled(settingName: string) {
    const disabledAttr = await this.page.testSubj
      .locator(`management-settings-editField-${settingName}`)
      .getAttribute('disabled');
    return disabledAttr === 'true' || disabledAttr === '';
  }

  headerBadge() {
    return this.page.testSubj.locator('headerBadge');
  }
}
