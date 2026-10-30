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
  readonly searchBar;
  readonly saveButton;
  readonly reloadToastButton;

  constructor(private readonly page: ScoutPage) {
    this.searchBar = page.getByTestId('settingsSearchBar');
    this.saveButton = page.getByTestId('settings-save-button');
    this.reloadToastButton = page.getByTestId('pageReloadButton');
  }

  async goto() {
    await this.page.gotoApp('management/kibana/settings');
    await this.waitForPageLoad();
  }

  async waitForPageLoad() {
    await this.page.getByTestId('managementSettingsTitle').waitFor({ state: 'visible' });
  }

  async openGlobalSettingsTab() {
    const tab = this.page.getByTestId('settings-tab-global-settings');
    await tab.click();
    await tab.and(this.page.getByRole('tab', { selected: true })).waitFor({ state: 'visible' });
  }

  // `~` also matches color pickers, whose test subject is prefixed with `euiColorPickerAnchor`.
  getField(settingName: string) {
    return this.page.testSubj.locator(`~management-settings-editField-${settingName}`);
  }

  async getAdvancedSettingValue(settingName: string) {
    return this.getField(settingName).inputValue();
  }

  // Clicks Save and waits for the change to be applied. The save button lives in
  // the unsaved-changes bottom bar, which is removed once the save completes, so
  // its disappearance is the real "saved" signal (the page title is always
  // visible and waiting on it is a no-op).
  async saveAndWait() {
    await this.saveButton.click();
    await this.saveButton.waitFor({ state: 'hidden' });
  }

  async setAdvancedSettingsSelect(settingName: string, value: string) {
    await this.getField(settingName).selectOption(value);
    await this.saveAndWait();
  }

  async setAdvancedSettingsInput(settingName: string, value: string) {
    const field = this.getField(settingName);
    await field.clear();
    await field.fill(value);
    await this.saveAndWait();
  }

  async clearAdvancedSetting(settingName: string) {
    await this.page.getByTestId(`management-settings-resetField-${settingName}`).click();
    await this.saveAndWait();
  }

  async toggleAdvancedSettingCheckbox(settingName: string) {
    await this.getField(settingName).click();
    await this.saveAndWait();
  }

  async getAdvancedSettingCheckboxValue(settingName: string) {
    const ariaChecked = await this.getField(settingName).getAttribute('aria-checked');
    return ariaChecked === 'true';
  }

  async isSettingDisabled(settingName: string) {
    const disabledAttr = await this.getField(settingName).getAttribute('disabled');
    return disabledAttr === 'true' || disabledAttr === '';
  }

  async reloadFromToast() {
    await Promise.all([this.page.waitForEvent('load'), this.reloadToastButton.click()]);
    await this.waitForPageLoad();
  }

  headerBadge() {
    return this.page.getByTestId('headerBadge');
  }
}
