/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { screen } from '@testing-library/react';

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
}
