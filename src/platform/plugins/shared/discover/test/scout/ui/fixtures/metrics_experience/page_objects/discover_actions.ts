/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class DiscoverActions {
  constructor(private readonly page: ScoutPage) {}

  private async waitUntilSearchingHasFinished() {
    await this.page.testSubj.waitForSelector('discoverDataGridUpdating', {
      state: 'hidden',
      timeout: 30000,
    });
  }

  async runRecommendedEsqlQuery(queryLabel: string) {
    await this.openRecommendedQueriesPanel();

    const recommendedQueriesDialog = this.page.testSubj
      .locator('esql-menu-popover')
      .or(this.page.locator('[role="dialog"]'));

    const queryOption = recommendedQueriesDialog.getByRole('button', {
      exact: true,
      name: queryLabel,
    });

    await expect(queryOption).toBeVisible({ timeout: 30_000 });
    await queryOption.click();
    await this.waitUntilSearchingHasFinished();
  }

  async openRecommendedQueriesPanel() {
    const menuPopover = this.page.testSubj.locator('esql-menu-popover');
    if (!(await menuPopover.isVisible())) {
      await this.page.testSubj.click('esql-help-popover-button');
    }

    await expect(menuPopover).toBeVisible();
    const selectedPanelTitleButton = this.page.testSubj.locator('contextMenuPanelTitleButton');
    if (await selectedPanelTitleButton.isVisible()) {
      return;
    }

    const recommendedQueriesCategoryButton = this.page.testSubj.locator('esql-recommended-queries');
    await expect(recommendedQueriesCategoryButton).toBeVisible();
    await recommendedQueriesCategoryButton.click();
    await expect(selectedPanelTitleButton).toBeVisible();
  }

  async addBreakdownFieldFromSidebar(field: string) {
    const sidebarToggleButton = this.page.testSubj.locator('discover-sidebar-fields-button');
    if (await sidebarToggleButton.isVisible()) {
      await sidebarToggleButton.click();
    }

    await this.page.testSubj.waitForSelector(`field-${field}`);
    const fieldListItem = this.page.testSubj.locator(`field-${field}`);
    await expect(fieldListItem).toBeVisible();
    const addBreakdownField = this.page.testSubj.locator(
      `fieldPopoverHeader_addBreakdownField-${field}`
    );

    if (!(await addBreakdownField.isVisible())) {
      await fieldListItem.scrollIntoViewIfNeeded();
      await fieldListItem.click();
    }

    await expect(addBreakdownField).toBeVisible();
    await addBreakdownField.click();
    await this.waitUntilSearchingHasFinished();
  }
}
