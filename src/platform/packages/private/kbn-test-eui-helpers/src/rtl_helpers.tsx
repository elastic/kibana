/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import moment from 'moment';
import userEvent from '@testing-library/user-event';
import type { Screen } from '@testing-library/react';
import { screen, within, fireEvent } from '@testing-library/react';

export const getSelectedButtonInGroup =
  (testId: string, container: Screen | ReturnType<typeof within> = screen) =>
  () => {
    const buttonGroup = container.getByTestId(testId);
    return within(buttonGroup).getByRole('button', { pressed: true });
  };

export class EuiButtonGroupTestHarness {
  #testId: string;

  /**
   * Returns button group or throws
   */
  get #buttonGroup() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of button group
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns button group if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of button groups
   */
  public get options() {
    return within(this.#buttonGroup).getAllByRole('button');
  }

  /**
   * Returns selected option of button group
   */
  public get selected() {
    return within(this.#buttonGroup).getByRole('button', { pressed: true });
  }

  /**
   * Select option from group
   */
  public select(optionName: string | RegExp) {
    const option = within(this.#buttonGroup).getByRole('button', { name: optionName });
    fireEvent.click(option);
  }
}

export class EuiSuperDatePickerTestHarness {
  // From https://github.com/elastic/eui/blob/6a30eba7c2a154691c96a1d17c8b2f3506d351a3/src/components/date_picker/super_date_picker/super_date_picker.tsx#L222
  private static readonly dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

  /**
   * This method returns the currently selected commonly-used range as a string
   *
   * The empty string is returned if a commonly-used range is not currently selected
   */
  public static get currentCommonlyUsedRange() {
    return screen.queryByTestId('superDatePickerShowDatesButton')?.textContent ?? '';
  }

  /**
   * This method returns the currently selected range as a pair of strings
   */
  public static get currentRange() {
    if (screen.queryByTestId('superDatePickerShowDatesButton')) {
      // showing a commonly-used range
      return { from: '', to: '' };
    }

    return {
      from: screen.getByTestId('superDatePickerstartDatePopoverButton').textContent,
      to: screen.getByTestId('superDatePickerendDatePopoverButton').textContent,
    };
  }

  /**
   * This method runs an assertion against the currently selected range using
   * UNIX timestamps.
   *
   * NOTE: it does not (yet) support commonly-used (textual) ranges like "Last 15 minutes"
   */
  public static assertCurrentRange(range: { from: number; to: number }, expect: jest.Expect) {
    expect(EuiSuperDatePickerTestHarness.currentRange).toEqual({
      from: moment(range.from).format(EuiSuperDatePickerTestHarness.dateFormat),
      to: moment(range.to).format(EuiSuperDatePickerTestHarness.dateFormat),
    });
  }

  /**
   * Opens the popover for the date picker
   */
  static async togglePopover() {
    await userEvent.click(screen.getByRole('button', { name: 'Date quick select' }));
  }

  /**
   * Selects a commonly-used range from the date picker (opens the popover if it's not already open)
   */
  static async selectCommonlyUsedRange(label: string) {
    if (!screen.queryByText('Commonly used')) await this.togglePopover();

    // Using fireEvent here because userEvent erroneously claims that
    // pointer-events is set to 'none'.
    //
    // I have verified that this fixed on the latest version of the @testing-library/user-event package
    fireEvent.click(await screen.findByText(label));
  }

  /**
   * Activates the refresh button
   */
  static async refresh() {
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  }
}

export class EuiSelectTestHarness {
  #testId: string;

  /**
   * Returns select or throws
   */
  get #selectEl() {
    return screen.getByTestId(this.#testId);
  }

  constructor(testId: string) {
    this.#testId = testId;
  }

  /**
   * Returns `data-test-subj` of select
   */
  public get testId() {
    return this.#testId;
  }

  /**
   * Returns button select if found, otherwise `null`
   */
  public get self() {
    return screen.queryByTestId(this.#testId);
  }

  /**
   * Returns all options of select
   */
  public get options(): HTMLOptionElement[] {
    return within(this.#selectEl).getAllByRole('option');
  }

  /**
   * Returns selected option
   */
  public get selected() {
    return (this.#selectEl as HTMLSelectElement).value;
  }

  /**
   * Select option by value
   */
  public select(optionName: string | RegExp) {
    const option = this.options.find((o) => o.value === optionName)?.value;

    if (!option) {
      throw new Error(`Option [${optionName}] not found`);
    }

    fireEvent.change(this.#selectEl, { target: { value: option } });
  }
}

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
