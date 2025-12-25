/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen, within } from '@testing-library/react';

export class EuiTableTestHarness {
  #testId: string;

  /**
   * Returns table element or throws
   */
  get #tableEl() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of table
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns table if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  public get body() {
    return this.#tableEl?.querySelector('tbody');
  }

  /**
   * Get table row elements for direct interaction with cells.
   * Useful when you need to click buttons, checkboxes, or other interactive elements within rows.
   *
   * @returns {HTMLElement[]} Array of table row elements
   *
   * @example
   * const table = new EuiTableTestHarness('myTable');
   * const rows = table.rows;
   * const firstRowCheckbox = within(rows[0]).getByRole('checkbox');
   * await user.click(firstRowCheckbox);
   */
  public get rows(): HTMLElement[] {
    return Array.from(this.body?.querySelectorAll('tr') ?? []);
  }

  /**
   * Returns the number of data rows in the table body.
   */
  public get rowCount(): number {
    return this.rows.length;
  }

  /**
   * Returns a data row by index (0-based; table body only).
   *
   * Useful to avoid `index + 1` header offsets and keep tests aligned with visible row order.
   */
  public rowAt(rowIndex: number): HTMLElement {
    const row = this.rows[rowIndex];
    if (!row) {
      throw new Error(`Expected row ${rowIndex} to exist in table "${this.#testId}"`);
    }
    return row;
  }

  /**
   * Returns the first data row in the table body.
   * Useful when asserting the "first visible row" after sort/pagination without exposing array indexing in tests.
   */
  public get firstRow(): HTMLElement {
    const [row] = this.rows;
    if (!row) throw new Error(`Expected at least one row in table "${this.#testId}"`);
    return row;
  }

  /**
   * Returns the only data row in the table body.
   * Useful for filtered tables where exactly one row is expected.
   */
  public get soleRow(): HTMLElement {
    const rows = this.rows;
    if (rows.length !== 1) {
      throw new Error(`Expected exactly one row in table "${this.#testId}", got ${rows.length}`);
    }
    return rows[0];
  }

  /**
   * Find a row by visible text content in any cell.
   * Works for EUI tables rendered with semantic <tr>/<td>.
   */
  public getRowByCellText(text: string): HTMLElement {
    const cellEl = within(this.#tableEl).getByText(text);
    const rowEl = cellEl.closest('tr') as HTMLElement | null;
    if (!rowEl)
      throw new Error(`Expected text "${text}" to be inside a table row in "${this.#testId}"`);
    return rowEl;
  }

  /**
   * Get table cell values as a 2D array.
   * Useful for asserting table data in a structured way.
   *
   * @returns {string[][]} Array of rows, where each row is an array of cell text values
   *
   * @example
   * const table = new EuiTableTestHarness('myTable');
   * const cellValues = table.getCellValues();
   * expect(cellValues[0]).toEqual(['', 'Name', 'Status', '']);
   */
  public get cellValues(): string[][] {
    return this.rows.map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      return cells.map((cell) => {
        const content =
          cell.querySelector('.euiTableCellContent__text') ||
          cell.querySelector('.euiTableCellContent') ||
          cell;
        // Preserve original text content including whitespace (don't trim)
        return content.textContent || '';
      });
    });
  }

  /**
   * Get table cell values with optional normalization.
   *
   * Note: This operates on tbody rows (no header row).
   */
  public getCellValues(options: { trim?: boolean; collapseWhitespace?: boolean } = {}): string[][] {
    const { trim = false, collapseWhitespace = false } = options;

    const normalize = (value: string) => {
      let v = value;
      if (trim) v = v.trim();
      if (collapseWhitespace) v = v.replace(/\s+/g, ' ');
      return v;
    };

    return this.cellValues.map((row) => row.map((cell) => normalize(cell)));
  }

  /**
   * Common convenience: trimmed + whitespace-collapsed cell values.
   */
  public get normalizedCellValues(): string[][] {
    return this.getCellValues({ trim: true, collapseWhitespace: true });
  }
}
