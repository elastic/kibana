/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class LensApp {
  constructor(private readonly page: ScoutPage) {}

  async waitForLensApp() {
    await this.page.testSubj.waitForSelector('lnsApp', { state: 'visible' });
  }

  async switchToVisualization(visType: string) {
    await this.openChartSwitchPopover();
    await this.page.testSubj.click(`lnsChartSwitchPopover_${visType}`);
    await this.applyChangesIfPresent();
    await this.page.waitForLoadingIndicatorHidden();
  }

  async saveAndReturn() {
    await this.page.testSubj.click('lnsApp_saveAndReturnButton');
  }

  async saveToLibraryAndReturn(title: string) {
    await this.page.testSubj.click('lnsApp_saveButton');
    await this.page.testSubj.fill('savedObjectTitle', title);
    const saveToLibraryCheckbox = this.page.testSubj.locator('add-to-library-checkbox');
    if ((await saveToLibraryCheckbox.count()) > 0) {
      const isChecked = (await saveToLibraryCheckbox.getAttribute('aria-checked')) === 'true';
      if (!isChecked) {
        await this.page.locator('label[for="add-to-library-checkbox"]').click();
      }
    }

    const returnToOrigin = this.page.testSubj.locator('returnToOriginModeSwitch');
    if ((await returnToOrigin.count()) > 0) {
      const isChecked = (await returnToOrigin.getAttribute('aria-checked')) === 'true';
      if (!isChecked) {
        await returnToOrigin.click();
      }
    }

    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'hidden' });
    await this.page.testSubj.waitForSelector('lnsApp', { state: 'hidden' });
  }

  async openSaveModal() {
    await this.page.testSubj.click('lnsApp_saveButton');
  }

  async expectReturnToOriginSwitchMissing() {
    await this.page.testSubj.waitForSelector('returnToOriginModeSwitch', { state: 'hidden' });
  }

  async waitForSaveButtonEnabled() {
    const saveButton = this.page.testSubj.locator('lnsApp_saveButton');
    await saveButton.waitFor({ state: 'visible' });
    await this.page.waitForFunction(
      (element) => !element.hasAttribute('disabled'),
      await saveButton.elementHandle()
    );
  }

  private async openChartSwitchPopover() {
    if ((await this.page.testSubj.locator('lnsChartSwitchList').count()) > 0) {
      return;
    }
    await this.page.testSubj.click('lnsChartSwitchPopover');
    await this.page.testSubj.waitForSelector('lnsChartSwitchList', { state: 'visible' });
  }

  private async applyChangesIfPresent() {
    const applyButton = this.page.testSubj.locator('lnsApplyChanges__apply');
    if ((await applyButton.count()) > 0) {
      await applyButton.click();
    }
  }
}
