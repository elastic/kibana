/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { DateRangePicker, type DateRangePickerProps } from './date_range_picker';

const defaultProps: DateRangePickerProps = {
  defaultValue: 'last 20 minutes',
  onChange: () => {},
};

describe('DateRangePicker', () => {
  it('renders', () => {
    const { container } = renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  describe('editing mode', () => {
    const openEditing = () => {
      fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
      return screen.getByTestId('dateRangePickerInput');
    };

    it('enters editing mode on control button click', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={() => {}} />);

      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();

      const input = openEditing();

      expect(input).toHaveFocus();
      expect(screen.queryByTestId('dateRangePickerControlButton')).not.toBeInTheDocument();
    });

    it('submits on Enter and returns to display mode', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      const input = openEditing();

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
    });

    it('cancels on Escape and returns to display mode', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      const input = openEditing();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
    });

    it('restores previous text on Escape after typing', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const input = openEditing();

      fireEvent.change(input, { target: { value: 'something else' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      const button = screen.getByTestId('dateRangePickerControlButton');
      expect(button).toHaveTextContent('Last 20 minutes');
    });

    it('closes on outside click and returns to display mode', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      openEditing();

      fireEvent.mouseDown(document.body);
      fireEvent.mouseUp(document.body);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
    });
  });
});
