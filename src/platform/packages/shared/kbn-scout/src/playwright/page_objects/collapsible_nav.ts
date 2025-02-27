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
import { ScoutTestConfig } from '../../types';

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

  async clickItem(itemName: string) {
    await this.expandNav();
    const itemLocator = this.config.serverless
      ? `a#${itemName.toLowerCase()}`
      : `[title="${itemName}"]`;
    return this.page.click(itemLocator);
  }
}
