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
  async refresh(timeout = 30_000) {
    await this.page.testSubj.click('sessionManagementRefreshBtn');
    await expect(this.rows()).not.toHaveCount(0, { timeout });
  }

  private rows(): Locator {
    return this.table.getByTestId('searchSessionsRow');
  }

  async expectRowCount(count: number, timeout = 30_000) {
    await expect(this.rows()).toHaveCount(count, { timeout });
  }

  async waitForEmptyTable(timeout = 30_000) {
    await expect(this.rows()).toHaveCount(0, { timeout });
  }

  async waitForRowStatus(targetStatus: string, timeout = 30_000) {
    const badge = this.table.getByTestId('sessionManagementStatusLabel');
    await expect(badge).toHaveAttribute('data-test-status', targetStatus, { timeout });
  }

  async getRowExpires(): Promise<string> {
    return this.table.getByTestId('sessionManagementExpiresCol').innerText();
  }

  async renameRow(newName: string) {
    await this.table.getByTestId('sessionManagementActionsCol').click();
    await this.page.testSubj.click('sessionManagementPopoverAction-rename');
    const input = this.page.testSubj.locator('editNameInput');
    await input.fill(newName);
    await this.page.testSubj.click('confirmEditName');
  }

  async deleteRow() {
    await this.table.getByTestId('sessionManagementActionsCol').click();
    await this.page.testSubj.click('sessionManagementPopoverAction-delete');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  async viewRow() {
    await this.table.getByTestId('sessionManagementNameLink').click();
  }
}
