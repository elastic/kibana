/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator, ScoutPage } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';

/**
 * Page object for the Background Search management UI at the URL:
 * /app/management/kibana/search_sessions.
 */
export class BackgroundSearchManagementPage {
  private readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('searchSessionsMgmtUiTable');
  }

  async goTo() {
    await this.page.gotoApp('management/kibana/search_sessions');
    await this.table.waitFor({ state: 'visible', timeout: 30_000 });
  }

  private rows(): Locator {
    return this.table.getByTestId('searchSessionsRow');
  }

  async expectRowCount(count: number) {
    await expect(this.rows()).toHaveCount(count);
  }

  async waitForRowStatus(targetStatus: string) {
    const statusBadge = this.table.getByTestId('sessionManagementStatusLabel');
    const refreshButton = this.page.testSubj.locator('sessionManagementRefreshBtn');

    await expect
      .poll(
        async () => {
          await refreshButton.click();
          return statusBadge.getAttribute('data-test-status');
        },
        { timeout: 30_000, intervals: [2_000] }
      )
      .toBe(targetStatus);
  }

  async getRowExpires(): Promise<string> {
    return this.table.getByTestId('sessionManagementExpiresCol').innerText();
  }

  /** How many searches the background search row groups. */
  async getRowSearchesCount(): Promise<number> {
    const text = await this.table.getByTestId('sessionManagementNumSearchesCol').innerText();
    return Number(text.trim());
  }

  /** The app URL the background search row restores into. */
  async getRowRestoreUrl(): Promise<string> {
    const href = await this.table.getByTestId('sessionManagementNameLink').getAttribute('href');
    if (!href) {
      throw new Error('Background search row has no restore URL');
    }
    return href;
  }

  async renameRow(newName: string) {
    await this.table.getByTestId('sessionManagementActionsCol').click();
    await this.page.testSubj.click('sessionManagementPopoverAction-rename');
    const input = this.page.testSubj.locator('editNameInput');
    await input.fill(newName);
    await this.page.testSubj.click('confirmEditName');
    // The rename modal's overlay mask swallows pointer events until it unmounts, so anything
    // clicked next races its removal. Waiting on the input covers the whole modal.
    await input.waitFor({ state: 'hidden' });
  }

  async viewRow() {
    await this.table.getByTestId('sessionManagementNameLink').click();
  }
}
