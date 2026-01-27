/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { screen, within, fireEvent } from '@testing-library/react';

export class EuiSuperDatePickerTestHarness {
  // From https://github.com/elastic/eui/blob/6a30eba7c2a154691c96a1d17c8b2f3506d351a3/src/components/date_picker/super_date_picker/super_date_picker.tsx#L222
  private static readonly dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

  #root: Document | HTMLElement;

  constructor(root: Document | HTMLElement = document) {
    this.#root = root;
  }

  #queries() {
    return this.#root instanceof HTMLElement ? within(this.#root) : screen;
  }

  /**
   * This method returns the currently selected commonly-used range as a string
   *
   * The empty string is returned if a commonly-used range is not currently selected
   */
  public get currentCommonlyUsedRange() {
    return this.#queries().queryByTestId('superDatePickerShowDatesButton')?.textContent ?? '';
  }

  /**
   * This method returns the currently selected range as a pair of strings.
   * Returns `null` if the date picker is not found or not properly initialized.
   */
  public get currentRange(): { from: string; to: string } | null {
    const queries = this.#queries();
    if (queries.queryByTestId('superDatePickerShowDatesButton')) {
      // showing a commonly-used range
      return { from: '', to: '' };
    }

    const fromEl = queries.queryByTestId('superDatePickerstartDatePopoverButton');
    const toEl = queries.queryByTestId('superDatePickerendDatePopoverButton');
    if (!fromEl || !toEl) {
      return null;
    }

    return {
      from: fromEl.textContent ?? '',
      to: toEl.textContent ?? '',
    };
  }

  /**
   * This method runs an assertion against the currently selected range using
   * UNIX timestamps.
   *
   * NOTE: it does not (yet) support commonly-used (textual) ranges like "Last 15 minutes"
   */
  public assertCurrentRange(range: { from: number; to: number }, expect: jest.Expect) {
    expect(this.currentRange).toEqual({
      from: moment(range.from).format(EuiSuperDatePickerTestHarness.dateFormat),
      to: moment(range.to).format(EuiSuperDatePickerTestHarness.dateFormat),
    });
  }

  /**
   * Opens the popover for the date picker
   */
  public togglePopover() {
    const queries = this.#queries();
    // Prefer EUI's stable test subject. This is used by EUI itself in tests.
    const toggle = queries.queryByTestId('superDatePickerToggleQuickMenuButton');
    if (toggle) {
      fireEvent.click(toggle);
      return;
    }

    // Fallback for older/embedded variants where the test subject may differ.
    const fallbackToggle = queries.queryByRole('button', { name: 'Date quick select' });
    if (!fallbackToggle) {
      throw new Error('Expected date picker toggle button to exist');
    }
    fireEvent.click(fallbackToggle);
  }

  /**
   * Selects a commonly-used range from the date picker (opens the popover if it's not already open)
   */
  public async selectCommonlyUsedRange(label: string) {
    if (!this.#queries().queryByText('Commonly used')) this.togglePopover();

    fireEvent.click(await this.#queries().findByText(label));
  }

  /**
   * Activates the refresh button
   */
  public refresh() {
    const refreshButton = this.#queries().queryByRole('button', { name: 'Refresh' });
    if (!refreshButton) {
      throw new Error('Expected refresh button to exist');
    }
    fireEvent.click(refreshButton);
  }
}
