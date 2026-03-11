/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

export class DiscoverActions {
  public readonly menuPopover: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.menuPopover = page.testSubj.locator('esql-menu-popover');
  }

  async runRecommendedEsqlQuery(queryLabel: string) {
    await this.openRecommendedQueriesPanel();

    const queryOption = this.menuPopover.getByRole('button', {
      exact: true,
      name: queryLabel,
    });

    await expect(queryOption).toBeVisible();
    await queryOption.click();
    await this.discover.waitUntilSearchingHasFinished();
  }

  async openRecommendedQueriesPanel() {
    if (!(await this.menuPopover.isVisible())) {
      await this.page.testSubj.click('esql-help-popover-button');
    }

    await expect(this.menuPopover).toBeVisible();
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

    await this.discover.waitUntilFieldListHasCountOfFields();
    await expect(this.page.testSubj.locator(`field-${field}`)).toBeVisible();
    await this.page.testSubj.locator(`field-${field}`).click();
    await expect(
      this.page.testSubj.locator(`fieldPopoverHeader_addBreakdownField-${field}`)
    ).toBeVisible();
    await this.page.testSubj.locator(`fieldPopoverHeader_addBreakdownField-${field}`).click();
    await this.discover.waitUntilSearchingHasFinished();
  }
}
