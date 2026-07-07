/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

interface SaveModalArgs {
  addToDashboard?: 'new' | 'existing' | null;
  saveToLibrary?: boolean;
  dashboardId?: string;
  saveAsNew?: boolean;
  redirectToOrigin?: boolean;
  description?: string;
}

type DashboardPickerOption =
  | 'add-to-library-option'
  | 'existing-dashboard-option'
  | 'new-dashboard-option';

export class TimeToVisualizePageObject extends FtrService {
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly log = this.ctx.getService('log');
  private readonly find = this.ctx.getService('find');
  private readonly common = this.ctx.getPageObject('common');
  private readonly dashboard = this.ctx.getPageObject('dashboard');
  private readonly retry = this.ctx.getService('retry');

  public async ensureSaveModalIsOpen() {
    await this.testSubjects.exists('savedObjectSaveModal', { timeout: 5000 });
  }

  public async ensureDashboardOptionsAreDisabled() {
    const dashboardSelector = await this.testSubjects.find('add-to-dashboard-options');
    await dashboardSelector.findByCssSelector(`input[id="new-dashboard-option"]:disabled`);
    await dashboardSelector.findByCssSelector(`input[id="existing-dashboard-option"]:disabled`);

    const librarySelector = await this.testSubjects.find('add-to-library-checkbox');
    await librarySelector.findByCssSelector(`input[id="add-to-library-checkbox"]:disabled`);
  }

  public async resetNewDashboard() {
    await this.dashboard.navigateToApp();
    await this.dashboard.gotoDashboardLandingPage();
    await this.dashboard.clickNewDashboard();
  }

  private async selectDashboard(dashboardId: string) {
    await this.retry.try(async () => {
      await this.testSubjects.waitForEnabled('open-dashboard-picker');
      await this.testSubjects.click('open-dashboard-picker');
      await this.testSubjects.setValue('dashboard-picker-search', dashboardId);
      await this.common.sleep(150); // wait for input debounce so loading starts
      await this.testSubjects.waitForEnabled('open-dashboard-picker');
      await this.testSubjects.click(`dashboard-picker-option-${dashboardId.replaceAll(' ', '-')}`);
      const dashboardPickerLabel = await this.testSubjects.getVisibleText('open-dashboard-picker');
      if (dashboardPickerLabel === 'Select dashboard') {
        throw new Error(`Dashboard not selected`);
      }
    });
  }

  public async setSaveModalValues(
    vizName: string,
    {
      saveAsNew,
      redirectToOrigin,
      addToDashboard,
      dashboardId,
      saveToLibrary,
      description,
    }: SaveModalArgs = {}
  ) {
    await this.testSubjects.setValue('savedObjectTitle', vizName, {
      typeCharByChar: true,
      clearWithKeyboard: true,
    });

    if (description !== undefined) {
      await this.testSubjects.setValue('savedObjectDescription', description, {
        typeCharByChar: true,
        clearWithKeyboard: true,
      });
    }

    const hasSaveAsNew = await this.testSubjects.exists('saveAsNewCheckbox');
    if (hasSaveAsNew && saveAsNew !== undefined) {
      const state = saveAsNew ? 'check' : 'uncheck';
      this.log.debug('save as new checkbox exists. Setting its state to', state);
      await this.testSubjects.setEuiSwitch('saveAsNewCheckbox', state);
    }

    const hasDashboardSelector = await this.testSubjects.exists('add-to-dashboard-options');
    if (hasDashboardSelector && addToDashboard !== undefined) {
      let option: DashboardPickerOption = 'add-to-library-option';
      if (addToDashboard) {
        option = dashboardId ? 'existing-dashboard-option' : 'new-dashboard-option';
      }
      this.log.debug('save modal dashboard selector, choosing option:', option);
      const dashboardSelector = await this.testSubjects.find('add-to-dashboard-options');
      const label = await dashboardSelector.findByCssSelector(`label[for="${option}"]`);
      await label.click();

      if (dashboardId) {
        await this.selectDashboard(dashboardId);
      }
    }

    const hasSaveToLibrary = await this.testSubjects.exists('add-to-library-checkbox');
    if (hasSaveToLibrary && saveToLibrary !== undefined) {
      const libraryCheckbox = await this.find.byCssSelector('#add-to-library-checkbox');
      const isChecked = await libraryCheckbox.isSelected();
      const needsClick = isChecked !== saveToLibrary;
      const state = saveToLibrary ? 'check' : 'uncheck';

      this.log.debug('save to library checkbox exists. Setting its state to', state);
      if (needsClick) {
        const selector = await this.testSubjects.find('add-to-library-checkbox');
        const label = await selector.findByCssSelector(`label[for="add-to-library-checkbox"]`);
        await label.click();
      }
    }

    const hasRedirectToOrigin = await this.testSubjects.exists('returnToOriginModeSwitch');
    if (hasRedirectToOrigin && redirectToOrigin !== undefined) {
      const state = redirectToOrigin ? 'check' : 'uncheck';
      this.log.debug('redirect to origin checkbox exists. Setting its state to', state);
      await this.testSubjects.setEuiSwitch('returnToOriginModeSwitch', state);
    }
  }

  public async saveFromModal(
    vizName: string,
    saveModalArgs: SaveModalArgs = { addToDashboard: null }
  ) {
    await this.ensureSaveModalIsOpen();

    await this.setSaveModalValues(vizName, saveModalArgs);
    this.log.debug('Click Save Visualization button');

    await this.testSubjects.click('confirmSaveSavedObjectButton');

    await this.common.waitForSaveModalToClose();
  }
}
