/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export interface ApmPage {
  clickManagedTableRowAction(
    rowText: string,
    actionTestSubj: string,
    tableTestSubj?: string
  ): Promise<void>;
  clickDetailLink(linkText: string, tableTestSubj?: string): Promise<void>;
  clickWaterfallItem(itemName: string): Promise<void>;
  dismissFlyout(): Promise<void>;
}

export function createApmPage(page: ScoutPage): ApmPage {
  return {
    async clickManagedTableRowAction(
      rowText: string,
      actionTestSubj: string,
      tableTestSubj?: string
    ) {
      const container = tableTestSubj ? page.testSubj.locator(tableTestSubj) : page;

      await container
        .locator('tr')
        .filter({ hasText: rowText })
        .locator('[data-test-subj="apmManagedTableActionsCellButton"]')
        .click();

      await page.testSubj.locator(actionTestSubj).click();
    },

    async clickDetailLink(linkText: string, tableTestSubj?: string) {
      const container = tableTestSubj
        ? page.testSubj.locator(tableTestSubj)
        : page.locator('table');

      await container.getByRole('link', { name: linkText }).click();
    },

    async clickWaterfallItem(itemName: string) {
      await page.testSubj.locator('waterfall').getByText(itemName).click();
    },

    async dismissFlyout() {
      const flyout = page.locator('.euiFlyout');
      await flyout.waitFor({ state: 'visible' });
      await page.keyboard.press('Escape');
      await flyout.waitFor({ state: 'hidden' });
    },
  };
}
