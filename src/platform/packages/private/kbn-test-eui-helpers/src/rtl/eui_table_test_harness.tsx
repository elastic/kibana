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
   * Returns table element if found, otherwise `null`.
   */
  public getElement(): HTMLElement | null {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns the table body (`<tbody>`) if found, otherwise `null`.
   */
  public getBody(): HTMLTableSectionElement | null {
    const el = this.getElement();
    return el?.querySelector('tbody') ?? null;
  }

  /**
   * Get table row elements for direct interaction with cells.
   * Useful when you need to click buttons, checkboxes, or other interactive elements within rows.
   *
   * @returns {HTMLElement[]} Array of table row elements (empty array if table/body not found)
   *
   * @example
   * const table = new EuiTableTestHarness('myTable');
   * const rows = table.getRows();
   * const firstRowCheckbox = within(rows[0]).getByRole('checkbox');
   * await user.click(firstRowCheckbox);
   */
  public getRows(): HTMLElement[] {
    const body = this.getBody();
    return Array.from(body?.querySelectorAll('tr') ?? []);
  }

  /**
   * Find a row by visible text content in any cell.
   * Works for EUI tables rendered with semantic <tr>/<td>.
   * Returns `null` if the text is not found or not inside a table row.
   */
  public getRowByCellText(text: string): HTMLElement | null {
    const el = this.getElement();
    if (!el) return null;
    const cellEl = within(el).queryByText(text);
    if (!cellEl) return null;
    return cellEl.closest('tr') as HTMLElement | null;
  }

  /**
   * Get table cell values (tbody only) as a 2D array.
   *
   * Defaults are geared towards typical test assertions (trimmed + whitespace-collapsed).
   */
  public getCellValues(
    options: { trim?: boolean; collapseWhitespace?: boolean } = {
      trim: true,
      collapseWhitespace: true,
    }
  ): string[][] {
    const { trim = true, collapseWhitespace = true } = options;

    const normalize = (value: string) => {
      let v = value;
      if (trim) v = v.trim();
      if (collapseWhitespace) v = v.replace(/\s+/g, ' ');
      return v;
    };

    return this.getRows().map((row) => {
      const cells = Array.from(row.querySelectorAll('td'));
      return cells.map((cell) => normalize(cell.textContent || ''));
    });
  }
}
