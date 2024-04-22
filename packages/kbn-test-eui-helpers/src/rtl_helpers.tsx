/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import userEvent from '@testing-library/user-event';
import { screen, within, fireEvent } from '@testing-library/react';

export const getSelectedButtonInGroup = (testId: string) => () => {
  const buttonGroup = screen.getByTestId(testId);
  return within(buttonGroup).getByRole('button', { pressed: true });
};

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
  static togglePopover() {
    userEvent.click(screen.getByRole('button', { name: 'Date quick select' }));
  }

  /**
   * Selects a commonly-used range from the date picker (opens the popover if it's not already open)
   */
  static async selectCommonlyUsedRange(label: string) {
    if (!screen.queryByText('Commonly used')) this.togglePopover();

    // Using fireEvent here because userEvent erroneously claims that
    // pointer-events is set to 'none'.
    //
    // I have verified that this fixed on the latest version of the @testing-library/user-event package
    fireEvent.click(await screen.findByText(label));
  }

  /**
   * Activates the refresh button
   */
  static refresh() {
    userEvent.click(screen.getByRole('button', { name: 'Refresh' }));
  }
}
