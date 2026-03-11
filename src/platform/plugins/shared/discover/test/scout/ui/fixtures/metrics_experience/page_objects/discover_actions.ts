/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, PageObjects, ScoutPage } from '@kbn/scout';

export class DiscoverActions {
  public readonly menuPopover: Locator;

  constructor(
    private readonly page: ScoutPage,
    private readonly discover: PageObjects['discover']
  ) {
    this.menuPopover = page.testSubj.locator('esql-menu-popover');
  }

  async runRecommendedEsqlQuery(queryLabel: string) {
    const panel = await this.openRecommendedQueriesPanel();

    const queryOption = panel.getByRole('button', {
      exact: true,
      name: queryLabel,
    });

    await queryOption.waitFor({ state: 'visible' });
    await queryOption.click();
    await this.discover.waitUntilSearchingHasFinished();
  }

  async openRecommendedQueriesPanel(): Promise<Locator> {
    if (!(await this.menuPopover.isVisible())) {
      await this.page.testSubj.click('esql-help-popover-button');
    }

    await this.menuPopover.waitFor({ state: 'visible' });
    const selectedPanelTitleButton = this.page.testSubj.locator('contextMenuPanelTitleButton');
    if (await selectedPanelTitleButton.isVisible()) {
      return this.menuPopover;
    }

    const recommendedQueriesCategoryButton = this.page.testSubj.locator('esql-recommended-queries');
    await this.menuPopover.waitFor({ state: 'visible' });
    await recommendedQueriesCategoryButton.click();
    await selectedPanelTitleButton.waitFor({ state: 'visible' });

    return this.menuPopover;
  }

  async addBreakdownFieldFromSidebar(field: string) {
    await this.discover.waitUntilFieldListHasCountOfFields();

    const fieldButton = this.page.testSubj.locator(`field-${field}-showDetails`);
    await fieldButton.scrollIntoViewIfNeeded();
    await fieldButton.click();

    const breakdownButton = this.page.testSubj.locator(
      `fieldPopoverHeader_addBreakdownField-${field}`
    );
    await breakdownButton.waitFor({ state: 'visible' });
    await breakdownButton.click();
    await this.discover.waitUntilSearchingHasFinished();
  }
}
