/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FtrService } from '../ftr_provider_context';

export class UnifiedTabsPageObject extends FtrService {
  private readonly retry = this.ctx.getService('retry');
  private readonly testSubjects = this.ctx.getService('testSubjects');
  private readonly find = this.ctx.getService('find');

  public async getTabElements() {
    return await this.find.allByCssSelector('[data-test-subj^="unifiedTabs_tab_"]');
  }

  public async getTabWidths() {
    const tabElements = await this.getTabElements();
    return await Promise.all(
      tabElements.map(async (tabElement) => {
        return (await tabElement.getSize()).width;
      })
    );
  }

  public async getNumberOfTabs() {
    const numberOfTabs = await this.getTabElements();
    return numberOfTabs.length;
  }

  public async createNewTab() {
    const numberOfTabs = await this.getNumberOfTabs();
    await this.testSubjects.click('unifiedTabs_tabsBar_newTabBtn');
    await this.retry.waitFor('the new tab to appear', async () => {
      const newNumberOfTabs = await this.getNumberOfTabs();
      return newNumberOfTabs === numberOfTabs + 1;
    });
  }

  public async isScrollable() {
    return (
      (await this.testSubjects.exists('unifiedTabs_tabsBar_scrollLeftBtn')) &&
      (await this.testSubjects.exists('unifiedTabs_tabsBar_scrollRightBtn'))
    );
  }

  public async canScrollMoreLeft() {
    const scrollLeftBtn = await this.testSubjects.find('unifiedTabs_tabsBar_scrollLeftBtn');
    return !(await scrollLeftBtn.getAttribute('disabled'));
  }

  public async canScrollMoreRight() {
    const scrollRightBtn = await this.testSubjects.find('unifiedTabs_tabsBar_scrollRightBtn');
    return !(await scrollRightBtn.getAttribute('disabled'));
  }

  public async waitForScrollButtons() {
    await this.retry.waitFor('scroll buttons to get ready', async () => {
      return (
        (await this.isScrollable()) &&
        ((await this.canScrollMoreLeft()) || (await this.canScrollMoreRight()))
      );
    });
  }
}
