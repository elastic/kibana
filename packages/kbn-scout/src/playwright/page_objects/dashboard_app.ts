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
    await this.page.testSubj.waitForSelector('emptyDashboardWidget', { state: 'visible' });
  }

  async saveDashboard(name: string) {
    await this.page.testSubj.click('dashboardInteractiveSaveMenuItem');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('confirmSaveSavedObjectButton', { state: 'hidden' });
  }

  async addPanelFromLibrary(...names: string[]) {
    await this.page.testSubj.click('dashboardAddFromLibraryButton');
    for (let i = 0; i < names.length; i++) {
      // clear search input after the first panel is added
      if (i > 0) {
        await this.page.testSubj.clearInput('savedObjectFinderSearchInput');
      }
      await this.page.testSubj.typeWithDelay('savedObjectFinderSearchInput', names[i]);
      await this.page.testSubj.click(`savedObjectTitle${names[i].replace(/ /g, '-')}`);
      // wait for the panel to be added
      await this.page.testSubj.waitForSelector(
        `embeddablePanelHeading-${names[i].replace(/[- ]/g, '')}`,
        {
          state: 'visible',
        }
      );
    }
    // close the flyout
    await this.page.testSubj.click('euiFlyoutCloseButton');
    await this.page.testSubj.waitForSelector('euiFlyoutCloseButton', { state: 'hidden' });
  }

  async customizePanel(options: {
    name: string;
    customTimeRageCommonlyUsed?: {
      value:
        | 'Today'
        | 'Last_15 minutes'
        | 'Last_1 hour'
        | 'Last_24 hours'
        | 'Last_30 days'
        | 'Last_90 days'
        | 'Last_1 year';
    };
  }) {
    await this.page.testSubj.hover(`embeddablePanelHeading-${options.name.replace(/ /g, '')}`);
    await this.page.testSubj.click('embeddablePanelAction-ACTION_CUSTOMIZE_PANEL');
    if (options.customTimeRageCommonlyUsed) {
      await this.page.testSubj.click('customizePanelShowCustomTimeRange');
      await this.page.testSubj.click(
        'customizePanelTimeRangeDatePicker > superDatePickerToggleQuickMenuButton'
      );
      await this.page.testSubj.click(
        `superDatePickerCommonlyUsed_${options.customTimeRageCommonlyUsed.value}`
      );
    }

    await this.page.testSubj.click('saveCustomizePanelButton');
    await this.page.testSubj.waitForSelector('saveCustomizePanelButton', { state: 'hidden' });
  }

  async removePanel(name: string | 'embeddableError') {
    const panelHeaderTestSubj =
      name === 'embeddableError' ? name : `embeddablePanelHeading-${name.replace(/ /g, '')}`;
    await this.page.testSubj.locator(panelHeaderTestSubj).scrollIntoViewIfNeeded();
    await this.page.testSubj.locator(panelHeaderTestSubj).hover();
    await this.page.testSubj.click('embeddablePanelToggleMenuIcon');
    await this.page.testSubj.click('embeddablePanelAction-deletePanel');
    await this.page.testSubj.waitForSelector(panelHeaderTestSubj, {
      state: 'hidden',
    });
  }
}
