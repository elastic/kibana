/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';

import { DateRangePicker, type DateRangePickerProps } from '../date_range_picker';
import { customTimeRangePanelTexts } from '../translations';

const defaultProps: DateRangePickerProps = {
  defaultValue: '-15m',
  onChange: () => {},
};

const openCustomPanel = () => {
  fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
  const input = screen.getByTestId('dateRangePickerInput');
  fireEvent.keyDown(input, { key: 'ArrowDown' });
  const dialog = screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByText('Custom time range'));
};

const getFieldset = (name: string) => {
  const groups = screen.getAllByRole('group', { name });
  return groups[0];
};
const getStartFieldset = () => getFieldset('Start date');
const getEndFieldset = () => getFieldset('End date');

describe('CustomTimeRangePanel', () => {
  describe('initial state', () => {
    it('derives start/end from the current time range', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} defaultValue="-15m" />);
      openCustomPanel();

      expect(within(getStartFieldset()).getByLabelText('Count')).toHaveValue(15);
      expect(
        within(getEndFieldset()).getByText('End time will be set to the time of the refresh.')
      ).toBeInTheDocument();
    });

    it('shows absolute tab with a non-empty value for absolute dates', () => {
      renderWithEuiTheme(
        <DateRangePicker {...defaultProps} defaultValue="2025-01-01 to 2025-06-01" />
      );
      openCustomPanel();

      const startInput = within(getStartFieldset()).getByLabelText('Start date absolute date');
      expect(startInput).toBeInTheDocument();
      expect((startInput as HTMLInputElement).value).not.toBe('');
    });
  });

  describe('relative controls', () => {
    it('updates count via the number input', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      const countInput = within(getStartFieldset()).getByLabelText('Count');
      fireEvent.change(countInput, { target: { value: '30' } });

      expect(countInput).toHaveValue(30);
    });

    it('switches unit and direction via the select', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      const select = within(getStartFieldset()).getByLabelText('Unit and direction');
      fireEvent.change(select, { target: { value: 'h_past' } });

      expect(select).toHaveValue('h_past');
    });
  });

  describe('tab switching', () => {
    it('switches from Relative to Absolute and shows a text input', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      const startFieldset = getStartFieldset();
      fireEvent.click(within(startFieldset).getByText('Absolute'));

      expect(within(startFieldset).getByLabelText('Start date absolute date')).toBeInTheDocument();
    });

    it('switches from Relative to Now and shows help text', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      fireEvent.click(within(getStartFieldset()).getByText('Now'));

      expect(
        within(getStartFieldset()).getByText(customTimeRangePanelTexts.nowStartHelpText)
      ).toBeInTheDocument();
    });
  });

  describe('absolute text editing', () => {
    it('does not clobber the other date part when typing', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      fireEvent.click(within(getStartFieldset()).getByText('Absolute'));
      const absInput = within(getStartFieldset()).getByLabelText('Start date absolute date');
      fireEvent.change(absInput, { target: { value: 'Jan 1 2025, 00:00' } });

      expect(
        within(getEndFieldset()).getByText('End time will be set to the time of the refresh.')
      ).toBeInTheDocument();
    });
  });

  describe('validation', () => {
    it('shows end-before-start error and disables Apply when end < start', () => {
      renderWithEuiTheme(
        <DateRangePicker {...defaultProps} defaultValue="2025-06-01 to 2025-01-01" />
      );
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByText(customTimeRangePanelTexts.endBeforeStartError)
      ).toBeInTheDocument();

      const applyButton = within(dialog).getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeDisabled();
    });

    it('does not show error for a valid range', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).queryByText(customTimeRangePanelTexts.endBeforeStartError)
      ).not.toBeInTheDocument();

      const applyButton = within(dialog).getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeEnabled();
    });
  });

  describe('shorthand display', () => {
    it('shows a shorthand value for a valid relative range', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} defaultValue="-15m" />);
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect((shorthandInput as HTMLInputElement).value).toBe('-15m');
    });

    it('shows "(not available)" when the range is invalid', () => {
      renderWithEuiTheme(
        <DateRangePicker {...defaultProps} defaultValue="2025-06-01 to 2025-01-01" />
      );
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect(shorthandInput).toHaveValue(customTimeRangePanelTexts.notAvailable);
    });
  });

  describe('apply', () => {
    it('calls onChange when the form is submitted', () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('save as preset', () => {
    it('does not show the checkbox when onPresetSave is not provided', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      openCustomPanel();

      expect(screen.queryByLabelText('Save as preset')).not.toBeInTheDocument();
    });

    it('calls onPresetSave when checkbox is checked and Apply is clicked', () => {
      const onPresetSave = jest.fn();
      renderWithEuiTheme(
        <DateRangePicker {...defaultProps} onPresetSave={onPresetSave} onChange={() => {}} />
      );
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByLabelText('Save as preset'));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

      expect(onPresetSave).toHaveBeenCalledTimes(1);
      expect(onPresetSave).toHaveBeenCalledWith(
        expect.objectContaining({ start: expect.any(String), end: expect.any(String) })
      );
    });
  });

  describe('go back', () => {
    it('restores original input text when going back without applying', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} defaultValue="-15m" />);
      openCustomPanel();

      const countInput = within(getStartFieldset()).getByLabelText('Count');
      fireEvent.change(countInput, { target: { value: '30' } });

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByText('Custom time range'));

      const input = screen.getByTestId('dateRangePickerInput');
      expect(input).toHaveValue('-15m');
    });
  });
});
