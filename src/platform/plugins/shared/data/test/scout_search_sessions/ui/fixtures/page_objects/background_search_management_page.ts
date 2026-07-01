/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@kbn/scout';
import { expect } from '@kbn/scout/ui';
import type { ScoutPage } from '@kbn/scout';

/**
 * Page object for the Background Search management UI at
 * /app/management/kibana/search_sessions.
 */
export class BackgroundSearchManagementPage {
  private readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('searchSessionsMgmtUiTable');
  }

  /** Navigate to the Background Search management page and wait for the table. */
  async goTo() {
    await this.page.gotoApp('management/kibana/search_sessions');
    await this.table.waitFor({ state: 'visible', timeout: 30_000 });
  }

  /**
   * Click the Refresh button and wait for at least one row to appear.
   * Use this after goTo() when you expect rows — the initial async data fetch
   * may not have completed when the table DOM element first becomes visible.
   */
  async refresh(timeout = 30_000) {
    await this.page.testSubj.click('sessionManagementRefreshBtn');
    await expect(this.rows()).not.toHaveCount(0, { timeout });
  }

  private rows(): Locator {
    return this.table.getByTestId('searchSessionsRow');
  }

  async getRowCount(): Promise<number> {
    return this.rows().count();
  }

  async waitForEmptyTable(timeout = 30_000) {
    await expect(this.rows()).toHaveCount(0, { timeout });
  }

  /**
   * Wait for the first row's status badge to reach `targetStatus`.
   * The management page auto-refreshes every 10 s when the server is started with
   * `--data.search.sessions.management.refreshInterval=10s`.
   */
  async waitForFirstRowStatus(targetStatus: string, timeout = 60_000) {
    const badge = this.table.getByTestId('sessionManagementStatusLabel');
    await expect(badge).toHaveAttribute('data-test-status', targetStatus, { timeout });
  }

  async getFirstRowName(): Promise<string> {
    return this.table.getByTestId('sessionManagementNameCol').innerText();
  }

  async getFirstRowExpires(): Promise<string> {
    return this.table.getByTestId('sessionManagementExpiresCol').innerText();
  }

  async renameFirstRow(newName: string) {
    await this.table.getByTestId('sessionManagementActionsCol').click();
    await this.page.testSubj.click('sessionManagementPopoverAction-rename');
    const input = this.page.testSubj.locator('editNameInput');
    await expect(input).toBeVisible();
    await input.fill(newName);
    await this.page.testSubj.click('confirmEditName');
  }

  async deleteFirstRow() {
    await this.table.getByTestId('sessionManagementActionsCol').click();
    await this.page.testSubj.click('sessionManagementPopoverAction-delete');
    await this.page.testSubj.click('confirmModalConfirmButton');
  }

  async viewFirstRow() {
    await this.table.getByTestId('sessionManagementNameLink').click();
  }
}
