/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '@kbn/scout';

export class VisualizeLibraryPage {
  readonly nameInput;
  readonly descriptionInput;
  private readonly searchBox;
  private readonly closeButton;

  constructor(private readonly page: ScoutPage) {
    this.nameInput = page.testSubj.locator('nameInput');
    this.descriptionInput = page.testSubj.locator('descriptionInput');
    this.searchBox = page.testSubj.locator('tableListSearchBox');
    this.closeButton = page.testSubj
      .locator('euiFlyoutCloseButton')
      .or(page.testSubj.locator('closeFlyoutButton'));
  }

  async goto() {
    await this.page.gotoApp('visualize', { readyWhen: this.searchBox });
  }

  async openInspector(title: string) {
    await this.searchBox.fill(title);
    await this.searchBox.press('Enter');
    const row = this.page.getByRole('row', { name: new RegExp(title) });
    await row.waitFor({ state: 'visible' });
    await row.getByTestId('inspect-action').click();
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async closeInspector() {
    await this.closeButton.click();
  }
}
