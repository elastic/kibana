/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutPage } from '..';

export class Inspector {
  constructor(private readonly page: ScoutPage) {}

  async open() {
    await this.page.testSubj.click('openInspectorButton');
    await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'visible' });
  }

  async close() {
    const isOpen = await this.page.testSubj.isVisible('inspectorPanel');
    if (isOpen) {
      await this.page.testSubj.click('euiFlyoutCloseButton');
      await this.page.testSubj.waitForSelector('inspectorPanel', { state: 'hidden' });
    }
  }

  async getTableData(): Promise<string[][]> {
    const table = this.page.locator('[data-test-subj="inspectorPanel"] table');
    await table.waitFor({ state: 'visible' });

    const rows = await table.locator('tbody tr').all();
    const data: string[][] = [];

    for (const row of rows) {
      const cells = await row.locator('td').all();
      const rowData: string[] = [];

      for (const cell of cells) {
        rowData.push(await cell.innerText());
      }
      data.push(rowData);
    }
    return data;
  }
}
