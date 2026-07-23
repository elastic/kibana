/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Locator } from '@playwright/test';
import type { ScoutPage } from '..';

/**
 * Page object for the shared Inspector flyout (opened from the `openInspectorButton`
 * in Visualize/Dashboard/Discover). Reads the inspector data table.
 */
export class Inspector {
  private readonly panel: Locator;
  private readonly closeButton: Locator;
  private readonly openButton: Locator;

  constructor(page: ScoutPage) {
    this.panel = page.testSubj.locator('inspectorPanel');
    this.closeButton = page.testSubj.locator('euiFlyoutCloseButton');
    this.openButton = page.testSubj.locator('openInspectorButton');
  }

  /**
   * Returns the "Inspect" button locator so specs can assert its state with a
   * web-first assertion (e.g. `await expect(inspector.getOpenButton()).toBeEnabled()`).
   */
  getOpenButton(): Locator {
    return this.openButton;
  }

  async open() {
    await this.openButton.click();
    await this.panel.waitFor({ state: 'visible' });
  }

  async close() {
    await this.closeButton.click();
    await this.panel.waitFor({ state: 'hidden' });
  }

  /** Returns the rows of the inspector data table as arrays of cell text. */
  async getTableData(): Promise<string[][]> {
    await this.panel.locator('tbody').waitFor({ state: 'visible' });
    const tableRows = this.panel.locator('tbody tr');

    return tableRows.evaluateAll((rows) =>
      rows.map((row) =>
        Array.from(row.querySelectorAll('td')).map((cell) => {
          const euiTableCellContent = cell.querySelector('.euiTableCellContent');
          return (euiTableCellContent ?? cell).textContent?.trim() ?? '';
        })
      )
    );
  }
}
