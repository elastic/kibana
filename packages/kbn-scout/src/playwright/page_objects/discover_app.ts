/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutPage } from '../fixtures/types';

export class DiscoverApp {
  constructor(private readonly page: ScoutPage) {}

  async goto() {
    await this.page.gotoApp('discover');
  }

  async selectDataView(name: string) {
    const currentValue = await this.page.testSubj.innerText('*dataView-switch-link');
    if (currentValue === name) {
      return;
    }
    await this.page.testSubj.click('*dataView-switch-link');
    await this.page.testSubj.waitForSelector('indexPattern-switcher');
    await this.page.testSubj.typeWithDelay('indexPattern-switcher--input', name);
    await this.page.testSubj.locator('indexPattern-switcher').locator(`[title="${name}"]`).click();
    await this.page.testSubj.waitForSelector('indexPattern-switcher', { state: 'hidden' });
    await this.page.waitForLoadingIndicatorHidden();
  }

  async clickNewSearch() {
    await this.page.testSubj.hover('discoverNewButton');
    await this.page.testSubj.click('discoverNewButton');
    await this.page.testSubj.hover('unifiedFieldListSidebar__toggle-collapse'); // cancel tooltips
  }

  async saveSearch(name: string) {
    await this.page.testSubj.click('discoverSaveButton');
    await this.page.testSubj.fill('savedObjectTitle', name);
    await this.page.testSubj.click('confirmSaveSavedObjectButton');
    await this.page.testSubj.waitForSelector('savedObjectSaveModal', { state: 'hidden' });
    await this.page.waitForLoadingIndicatorHidden();
  }

  async waitForHistogramRendered() {
    await this.page.testSubj.waitForSelector('unifiedHistogramRendered');
  }
}
