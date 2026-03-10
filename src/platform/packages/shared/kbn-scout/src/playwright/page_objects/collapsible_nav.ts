/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from 'playwright/test';
import type { ScoutPage } from '..';
import type { ScoutTestConfig } from '../../types';

export class CollapsibleNav {
  private toggleNavButton: Locator;

  constructor(private readonly page: ScoutPage, private readonly config: ScoutTestConfig) {
    this.toggleNavButton = this.page.testSubj.locator(
      this.config.serverless ? 'euiCollapsibleNavButton' : 'toggleNavButton'
    );
  }

  async expandNav() {
    if (await this.toggleNavButton.isVisible()) {
      const isExpanded = await this.toggleNavButton.getAttribute('aria-expanded');
      if (isExpanded === 'false') {
        await this.toggleNavButton.click();
      }
    }
  }

  async clickItem(
    itemName:
      | 'Discover'
      | 'Dashboards'
      | 'Maps'
      | 'Machine Learning'
      | 'stack_management'
      | 'management:maintenanceWindows',
    { lowercase = true }: { lowercase?: boolean } = {}
  ) {
    await this.expandNav();
    const itemId = lowercase ? itemName.toLocaleLowerCase() : itemName;
    return this.config.serverless
      ? this.page.testSubj.click(`*nav-item-id-${itemId}`)
      : this.page.click(`[title="${itemName}"]`);
  }

  async getNavLinks() {
    const collapsibleNav = this.page.testSubj.locator('collapsibleNav');
    if (!(await collapsibleNav.isVisible())) {
      await this.toggleNavButton.click();
      await collapsibleNav.waitFor({ state: 'visible' });
    }
    const navLinks = this.page.testSubj.locator('collapsibleNavAppLink');
    return navLinks.allInnerTexts();
  }

  async openMoreMenu() {
    await this.page.testSubj.click('kbnChromeNav-moreMenuTrigger');
  }

  async clickNavItemByDeepLinkId(deepLinkId: string) {
    await this.page.testSubj.click(`~nav-item-deepLinkId-${deepLinkId}`);
  }

  getNavItemById(id: string) {
    return this.page.testSubj.locator(`~nav-item-id-${id}`);
  }

  getNavItemByDeepLinkId(deepLinkId: string) {
    return this.page.testSubj.locator(`~nav-item-deepLinkId-${deepLinkId}`);
  }
}
