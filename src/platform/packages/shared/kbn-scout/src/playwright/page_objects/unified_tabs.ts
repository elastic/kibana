/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class UnifiedTabs {
  constructor(private readonly page: ScoutPage) {}

  public getTabElements() {
    return this.getTabsContainer().locator('[data-test-subj^="unifiedTabs_tab_"]');
  }

  public async getSelectedTab() {
    const selectedTab = this.getTabsContainer().locator('[data-test-subj^="unifiedTabs_tab_"]', {
      has: this.page.locator('[aria-selected="true"]'),
    });

    return {
      element: selectedTab,
      index: (await this.getTabElements().all()).indexOf(selectedTab),
      label: await selectedTab.locator('[data-test-subj="fullText"]').textContent(),
    };
  }

  public async clickSelectedTabMenuItem(menuItemTestSubj: string) {
    const { element } = await this.getSelectedTab();

    await element.hover();
    await element.locator('button[aria-label="Actions"]').click({ timeout: 10_000 });
    await this.page.testSubj.click(menuItemTestSubj);
  }

  private getTabsContainer() {
    return this.page.testSubj.locator('unifiedTabs_tabsBar');
  }
}
