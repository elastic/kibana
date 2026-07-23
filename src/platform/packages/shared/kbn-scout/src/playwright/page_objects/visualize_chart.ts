/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { subj } from '@kbn/test-subj-selector';
import type { ScoutPage } from '..';
import { expect } from '..';

/**
 * Page object for reading a rendered visualization, focused on the data table
 * (`tbvChart`) visualization. Ported from the FTR `visChart` page object.
 */
export class VisualizeChart {
  constructor(private readonly page: ScoutPage) {}

  async waitForRenderComplete() {
    await this.page
      .locator('[data-test-subj="visualizationLoader"][data-render-complete="true"]')
      .waitFor({ state: 'visible' });
  }

  /**
   * Returns the rendered data table contents. For a single table a `string[][]`
   * (rows of cell text) is returned; for split tables an array of tables
   * (`string[][][]`) is returned, mirroring the FTR helper.
   */
  async getTableVisContent({ stripEmptyRows = true }: { stripEmptyRows?: boolean } = {}): Promise<
    string[][] | string[][][]
  > {
    await this.waitForRenderComplete();

    const container = this.page.testSubj.locator('tbvChart');
    await container.waitFor({ state: 'visible' });

    const tables = await container.locator(subj('euiDataGridBody')).all();
    if (tables.length === 0) {
      return [];
    }

    const allData: string[][][] = [];
    for (const table of tables) {
      let data = await table.evaluate((el, cellDataTestSubj) => {
        const columnNumber = el.querySelectorAll('.euiDataGridHeaderCell').length;
        const cells = Array.from(el.querySelectorAll('[data-test-subj="dataGridRowCell"]')).map(
          (cell) => {
            const content = cell.querySelector(`[data-test-subj="${cellDataTestSubj}"]`);
            return ((content ?? cell).textContent ?? '').replace(/\u00a0/g, '').trim();
          }
        );
        const rows: string[][] = [];
        for (let i = 0; i < cells.length; i += columnNumber) {
          rows.push(cells.slice(i, i + columnNumber));
        }
        return rows;
      }, 'tbvChartCellContent');

      if (stripEmptyRows) {
        data = data.filter((row) => row.length > 0 && row.some((cell) => cell.trim().length > 0));
      }
      allData.push(data);
    }

    return allData.length === 1 ? allData[0] : allData;
  }

  /**
   * Returns the concatenated text of the data table header row.
   */
  async getTableVisHeader(): Promise<string> {
    return this.page.testSubj.locator('dataGridHeader').innerText();
  }

  /**
   * Sum of the `data-rendering-count` across all visualization loaders on the page.
   * Used to detect that a new render happened after an interaction.
   */
  private getRenderingCount(): Promise<number> {
    return this.page
      .locator('[data-test-subj="visualizationLoader"]')
      .evaluateAll((loaders) =>
        loaders.reduce((sum, el) => sum + Number(el.getAttribute('data-rendering-count') ?? 0), 0)
      );
  }

  /**
   * Clicks the "filter for value" action on a specific data table cell and waits for
   * the visualization to re-render with the applied filter.
   *
   * The action is triggered from the cell expansion popover rather than the inline
   * hover-action button: the inline button is revealed via an opacity transition and
   * clicking it does not reliably fire its handler, whereas the popover action is
   * always interactive and closes itself on click.
   * @param columnIndex zero-based column index
   * @param rowIndex zero-based visible row index
   */
  async filterOnTableCell(columnIndex: number, rowIndex: number) {
    const cell = this.page.locator(
      `[data-test-subj="euiDataGridBody"] [data-test-subj="dataGridRowCell"][data-gridcell-column-index="${columnIndex}"][data-gridcell-visible-row-index="${rowIndex}"]`
    );
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();

    const actionsWrapper = cell.locator('.euiDataGridRowCell__actionsWrapper');
    await actionsWrapper.waitFor({ state: 'visible' });
    await actionsWrapper.locator('.euiDataGridRowCell__expandCell').click();

    const popover = this.page.testSubj.locator('euiDataGridExpansionPopover');
    await popover.waitFor({ state: 'visible' });

    const renderingCountBefore = await this.getRenderingCount();
    await popover.locator(subj('tbvChartCell__filterForCellValue')).click();
    await popover.waitFor({ state: 'hidden' });

    // Applying the filter reloads the visualization(s); wait for a fresh render so
    // callers read the filtered table content instead of the pre-filter data.
    await expect
      .poll(() => this.getRenderingCount(), { timeout: 10_000 })
      .toBeGreaterThan(renderingCountBefore);
  }
}
