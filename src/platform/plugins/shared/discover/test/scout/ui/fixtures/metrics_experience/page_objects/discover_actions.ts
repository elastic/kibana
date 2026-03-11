/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class DiscoverActions {
  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {}

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
    await this.discover.waitUntilSearchingHasFinished();
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

    const addBreakdownField = this.page.testSubj.locator(
      `fieldPopoverHeader_addBreakdownField-${field}`
    );

    // Open the field popover if it's not already visible. Re-query the field
    // locator each time to avoid stale element references after sidebar re-renders.
    await expect(this.page.testSubj.locator(`field-${field}`)).toBeVisible();
    if (!(await addBreakdownField.isVisible())) {
      await this.page.testSubj.locator(`field-${field}`).click();
    }

    await expect(addBreakdownField).toBeVisible();
    await addBreakdownField.click();
    await this.discover.waitUntilSearchingHasFinished();
  }
}
