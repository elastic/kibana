/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Locator } from 'playwright/test';
import { ScoutPage } from '..';

export class CollapsibleNav {
  private toggleNavButton: Locator;

  constructor(private readonly page: ScoutPage) {
    this.page = page;
    this.toggleNavButton = this.page.testSubj.locator('toggleNavButton');
  }

  async expandNav() {
    const isExpanded = await this.toggleNavButton.getAttribute('aria-expanded');
    if (isExpanded === 'false') {
      return this.toggleNavButton.click();
    }
  }

  async clickItem(itemName: string) {
    await this.expandNav();
    return this.page.click(`[title="${itemName}"]`);
  }
}
