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

import type { DateRangePickerProps } from '../date_range_picker';
import { DateRangePickerProvider, useDateRangePickerContext } from '../date_range_picker_context';
import {
  DateRangePickerPanel,
  DateRangePickerPanelNavigationProvider,
  useDateRangePickerPanelNavigation,
} from '../date_range_picker_panel_navigation';
import { customTimeRangePanelTexts } from '../translations';
import { CustomTimeRangePanel } from './custom_time_range_panel';

interface RenderPanelProps {
  defaultValue?: string;
  onChange?: DateRangePickerProps['onChange'];
  onPresetSave?: DateRangePickerProps['onPresetSave'];
}

const OpenCustomPanelButton = () => {
  const { navigateTo } = useDateRangePickerPanelNavigation();

  return (
    <button
      type="button"
      data-test-subj="openCustomTimeRangePanelButton"
      onClick={() => navigateTo(CustomTimeRangePanel.PANEL_ID)}
    >
      Open custom panel
    </button>
  );
};

const CurrentTextProbe = () => {
  const { text } = useDateRangePickerContext();

  return <output data-test-subj="currentDateRangeText">{text}</output>;
};

const TestHarness = ({
  defaultValue = '-15m',
  onChange = () => {},
  onPresetSave,
}: RenderPanelProps) => {
  return (
    <DateRangePickerProvider
      defaultValue={defaultValue}
      onChange={onChange}
      onPresetSave={onPresetSave}
    >
      <DateRangePickerPanelNavigationProvider defaultPanelId="main" panelDescriptors={[]}>
        <CurrentTextProbe />
        <DateRangePickerPanel id="main">
          <OpenCustomPanelButton />
        </DateRangePickerPanel>
        <DateRangePickerPanel id={CustomTimeRangePanel.PANEL_ID}>
          <div role="dialog">
            <CustomTimeRangePanel />
          </div>
        </DateRangePickerPanel>
      </DateRangePickerPanelNavigationProvider>
    </DateRangePickerProvider>
  );
};

const renderCustomTimeRangePanel = (props?: RenderPanelProps) => {
  renderWithEuiTheme(<TestHarness {...props} />);
};

const openCustomPanel = () => {
  fireEvent.click(screen.getByTestId('openCustomTimeRangePanelButton'));
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
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      expect(within(getStartFieldset()).getByLabelText('Count')).toHaveValue(15);
      expect(
        within(getEndFieldset()).getByText('End time will be set to the time of the refresh.')
      ).toBeInTheDocument();
    });

    it('shows absolute tab with a non-empty value for absolute dates', () => {
      renderCustomTimeRangePanel({ defaultValue: '2025-01-01 to 2025-06-01' });
      openCustomPanel();

      const startInput = within(getStartFieldset()).getByLabelText('Start date absolute date');
      expect(startInput).toBeInTheDocument();
      expect((startInput as HTMLInputElement).value).not.toBe('');
    });
  });

  describe('relative controls', () => {
    it('updates count via the number input', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      const countInput = within(getStartFieldset()).getByLabelText('Count');
      fireEvent.change(countInput, { target: { value: '30' } });

      expect(countInput).toHaveValue(30);
    });

    it('switches unit and direction via the select', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      const select = within(getStartFieldset()).getByLabelText('Unit and direction');
      fireEvent.change(select, { target: { value: 'h_past' } });

      expect(select).toHaveValue('h_past');
    });
  });

  describe('tab switching', () => {
    it('switches from Relative to Absolute and shows a text input', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      const startFieldset = getStartFieldset();
      fireEvent.click(within(startFieldset).getByText('Absolute'));

      expect(within(startFieldset).getByLabelText('Start date absolute date')).toBeInTheDocument();
    });

    it('switches from Relative to Now and shows help text', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      fireEvent.click(within(getStartFieldset()).getByText('Now'));

      expect(
        within(getStartFieldset()).getByText(customTimeRangePanelTexts.nowStartHelpText)
      ).toBeInTheDocument();
    });
  });

  describe('absolute text editing', () => {
    it('does not clobber the other date part when typing', () => {
      renderCustomTimeRangePanel();
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
      renderCustomTimeRangePanel({ defaultValue: '2025-06-01 to 2025-01-01' });
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      expect(
        within(dialog).getByText(customTimeRangePanelTexts.endBeforeStartError)
      ).toBeInTheDocument();

      const applyButton = within(dialog).getByRole('button', { name: 'Apply' });
      expect(applyButton).toBeDisabled();
    });

    it('does not show error for a valid range', () => {
      renderCustomTimeRangePanel();
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
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect((shorthandInput as HTMLInputElement).value).toBe('-15m');
    });

    it('shows "(not available)" when the range is invalid', () => {
      renderCustomTimeRangePanel({ defaultValue: '2025-06-01 to 2025-01-01' });
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect(shorthandInput).toHaveValue(customTimeRangePanelTexts.notAvailable);
    });
  });

  describe('apply', () => {
    it('calls onChange when the form is submitted', () => {
      const onChange = jest.fn();
      renderCustomTimeRangePanel({ onChange });
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('save as preset', () => {
    it('does not show the checkbox when onPresetSave is not provided', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      expect(screen.queryByLabelText('Save as preset')).not.toBeInTheDocument();
    });

    it('calls onPresetSave when checkbox is checked and Apply is clicked', () => {
      const onPresetSave = jest.fn();
      renderCustomTimeRangePanel({ onPresetSave });
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
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      const countInput = within(getStartFieldset()).getByLabelText('Count');
      fireEvent.change(countInput, { target: { value: '30' } });

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByText('Custom time range'));

      expect(screen.getByTestId('currentDateRangeText')).toHaveTextContent('-15m');
    });
  });
});
