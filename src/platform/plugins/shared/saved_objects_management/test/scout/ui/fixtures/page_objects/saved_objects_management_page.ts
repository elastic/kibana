/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage, Locator } from '@kbn/scout';

export class SavedObjectsManagementPage {
  readonly table: Locator;

  constructor(private readonly page: ScoutPage) {
    this.table = this.page.testSubj.locator('savedObjectsTable');
  }

  async goto() {
    await this.page.gotoApp('management/kibana/objects');
    // Wait for at least one row to appear (table finishes initial data load).
    // locator.waitFor() uses strict mode and fails on multiple elements; waitForFunction avoids this.
    await this.page.waitForFunction(
      () => document.querySelectorAll('[data-test-subj="savedObjectsTableRowTitle"]').length > 0
    );
  }

  async gotoInspect(type: string, id: string) {
    await this.page.gotoApp(`management/kibana/objects/${type}/${id}`);
    await this.page.testSubj.locator('savedObjectInspectEditor').waitFor({ state: 'visible' });
  }

  async getRowTitles(): Promise<string[]> {
    await this.table.waitFor({ state: 'visible' });
    const cells = await this.table.getByTestId('savedObjectsTableRowTitle').all();
    return Promise.all(cells.map((cell) => cell.locator('.euiTableCellContent').innerText()));
  }

  private getRowByTitle(title: string): Locator {
    return this.page.testSubj.locator('~savedObjectsTableRow').filter({
      has: this.page.getByTestId('savedObjectsTableRowTitle').filter({ hasText: title }),
    });
  }

  async openRelationshipsFlyout(title: string) {
    const row = this.getRowByTitle(title);
    const menuBtn = row.getByTestId('euiCollapsedItemActionsButton');
    const directBtn = row.getByTestId('savedObjectsTableAction-relationships');

    if (await menuBtn.isVisible()) {
      await menuBtn.click();
      await this.page
        .locator('.euiContextMenuPanel')
        .getByTestId('savedObjectsTableAction-relationships')
        .click();
    } else {
      await directBtn.click();
    }
  }

  async getInvalidRelations(): Promise<
    Array<{ type: string; id: string; relationship: string; error: string }>
  > {
    // Wait for the flyout to load the relationships data.
    // locator.waitFor() uses strict mode and fails on multiple elements; waitForFunction avoids this.
    await this.page.waitForFunction(
      () => document.querySelectorAll('[data-test-subj="invalidRelationshipsTableRow"]').length > 0
    );
    const rows = await this.page.testSubj.locator('invalidRelationshipsTableRow').all();
    const results = await Promise.all(
      rows.map(async (row) => ({
        type: await row
          .getByTestId('relationshipsObjectType')
          .locator('.euiTableCellContent')
          .innerText(),
        id: await row
          .getByTestId('relationshipsObjectId')
          .locator('.euiTableCellContent')
          .innerText(),
        relationship: await row
          .getByTestId('directRelationship')
          .locator('.euiTableCellContent')
          .innerText(),
        error: await row
          .getByTestId('relationshipsError')
          .locator('.euiTableCellContent')
          .innerText(),
      }))
    );
    return results.sort((a, b) => a.id.localeCompare(b.id));
  }

  async getInspectEditorContent(): Promise<string> {
    const editorLocator = this.page.testSubj.locator('savedObjectInspectEditor');
    await editorLocator.waitFor({ state: 'visible' });
    // Monaco virtualizes rendering; read the visible view-lines text
    return await editorLocator.locator('.view-lines').innerText();
  }

  async deleteCurrentObject() {
    await this.page.testSubj.locator('savedObjectEditDelete').click();
    await this.page.testSubj.locator('confirmModalConfirmButton').click();
    // Wait for redirect back to the objects list
    await this.table.waitFor({ state: 'visible' });
  }
}
