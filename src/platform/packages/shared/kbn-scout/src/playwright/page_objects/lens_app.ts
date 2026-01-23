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
  }

  async saveAndReturn() {
    await this.page.testSubj.click('lnsApp_saveAndReturnButton');
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
