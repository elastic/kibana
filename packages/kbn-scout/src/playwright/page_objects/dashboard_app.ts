/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../fixtures/types';

export class DashboardApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('dashboards');
  }

  async openNewDashboard() {
    await this.page.testSubj.click('newItemButton');
  }

  async addPanelFromLibrary(...names: string[]) {
    await this.page.testSubj.click('dashboardAddFromLibraryButton');
    for (let i = 0; i < names.length; i++) {
      if (i > 0) {
        await this.page.testSubj.locator('savedObjectFinderSearchInput').fill('');
      }
      await this.page.testSubj.typeWithDelay('savedObjectFinderSearchInput', names[i]);
      await this.page.testSubj.click(`savedObjectTitle${names[i].replace(/ /g, '-')}`);
      await this.page.testSubj.waitForSelector(
        `embeddablePanelHeading-${names[i].replace(/ /g, '')}`,
        {
          state: 'visible',
        }
      );
    }
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('euiFlyoutCloseButton', { state: 'hidden' });
  }

  async customizePanel(options: {
    name: string;
    customTimeRageCommonlyUsed?: { value: 'Last_90' };
  }) {
    await this.page.testSubj.hover(`embeddablePanelHeading-${options.name.replace(/ /g, '')}`);
    await this.page.testSubj.click('embeddablePanelAction-ACTION_CUSTOMIZE_PANEL');
    if (options.customTimeRageCommonlyUsed) {
      await this.page.testSubj.click('customizePanelShowCustomTimeRange');
      await this.page.testSubj.click(
        'customizePanelTimeRangeDatePicker > superDatePickerToggleQuickMenuButton'
      );
      await this.page.testSubj.click(
        `^superDatePickerCommonlyUsed_${options.customTimeRageCommonlyUsed.value}`
      );
    }

    await this.page.testSubj.click('saveCustomizePanelButton');
    await this.page.testSubj.waitForSelector('saveCustomizePanelButton', { state: 'hidden' });
  }
}
