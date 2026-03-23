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

/** Reads the current context text value so tests can assert what the input would show. */
const CurrentTextProbe = () => {
  const { text } = useDateRangePickerContext();
  return <output data-test-subj="currentDateRangeText">{text}</output>;
};

/**
 * Simulates the main input changing (e.g. the user typing). Fires onChange which
 * calls setText, exercising the input→panel sync path without needing to render the
 * full input field.
 */
const TextSetterProbe = () => {
  const { setText } = useDateRangePickerContext();
  return (
    <input aria-label="Set picker text" defaultValue="" onChange={(e) => setText(e.target.value)} />
  );
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
      settings={{ roundRelativeTime: false }}
      onSettingsChange={() => {}}
    >
      <DateRangePickerPanelNavigationProvider defaultPanelId="main" panelDescriptors={[]}>
        <CurrentTextProbe />
        <TextSetterProbe />
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
    it('derives start/end picker state from the current time range', () => {
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      expect(within(getStartFieldset()).getByLabelText('Count')).toHaveValue(15);
      expect(
        within(getEndFieldset()).getByText(customTimeRangePanelTexts.nowEndHelpText)
      ).toBeInTheDocument();
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

    it('switches from Relative to Now and shows side-specific help text', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      fireEvent.click(within(getStartFieldset()).getByText('Now'));
      expect(
        within(getStartFieldset()).getByText(customTimeRangePanelTexts.nowStartHelpText)
      ).toBeInTheDocument();

      fireEvent.click(within(getEndFieldset()).getByText('Now'));
      expect(
        within(getEndFieldset()).getByText(customTimeRangePanelTexts.nowEndHelpText)
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
        within(getEndFieldset()).getByText(customTimeRangePanelTexts.nowEndHelpText)
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
  });

  describe('shorthand display', () => {
    it('shows a shorthand value for a valid relative range', () => {
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect(shorthandInput).toHaveValue('-15m');
    });

    it('shows "(not available)" when the range is invalid', () => {
      renderCustomTimeRangePanel({ defaultValue: '2025-06-01 to 2025-01-01' });
      openCustomPanel();

      const shorthandInput = screen.getByLabelText('Shorthand');
      expect(shorthandInput).toHaveValue(customTimeRangePanelTexts.notAvailable);
    });
  });

  describe('input text sync', () => {
    it('strips the "now" prefix from relative dates when the panel drives the input', () => {
      // Start with the full date-math form to confirm it gets normalised to shorthand.
      renderCustomTimeRangePanel({ defaultValue: 'now-30m to now' });
      openCustomPanel();

      // Trigger a panel-driven change so Effect B fires and calls setText.
      fireEvent.change(within(getStartFieldset()).getByLabelText('Count'), {
        target: { value: '15' },
      });

      expect(screen.getByTestId('currentDateRangeText')).toHaveTextContent('-15m - now');
    });

    it('emits the literal "now" in the input for the Now type', () => {
      // Default: start=RELATIVE 15m, end=NOW. Switching start to Now produces "now - now".
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      fireEvent.click(within(getStartFieldset()).getByText('Now'));

      expect(screen.getByTestId('currentDateRangeText')).toHaveTextContent('now - now');
    });

    it('updates the panel UI when the input text changes to a valid range', () => {
      renderCustomTimeRangePanel({ defaultValue: '-15m' });
      openCustomPanel();

      fireEvent.change(screen.getByLabelText('Set picker text'), {
        target: { value: 'now-30m - now' },
      });

      expect(within(getStartFieldset()).getByLabelText('Count')).toHaveValue(30);
      expect(
        within(getEndFieldset()).getByText(customTimeRangePanelTexts.nowEndHelpText)
      ).toBeInTheDocument();
    });

    it('does not reset the panel when the input becomes partial or unparseable', () => {
      // '2025-01-01 to now' → start=ABSOLUTE "Jan 1 2025, 00:00", end=NOW.
      renderCustomTimeRangePanel({ defaultValue: '2025-01-01 to now' });
      openCustomPanel();

      const startAbsInput = within(getStartFieldset()).getByLabelText('Start date absolute date');
      expect(startAbsInput).toHaveValue('Jan 1 2025, 00:00');

      // Simulate the user clearing/partially typing in the main input.
      fireEvent.change(screen.getByLabelText('Set picker text'), {
        target: { value: '2025-01-01 to' },
      });

      // Panel state must not have been clobbered by a fallback timestamp.
      expect(startAbsInput).toHaveValue('Jan 1 2025, 00:00');
      expect(
        within(getEndFieldset()).getByText(customTimeRangePanelTexts.nowEndHelpText)
      ).toBeInTheDocument();
    });
  });

  describe('save as preset', () => {
    it('does not show the checkbox when onPresetSave is not provided', () => {
      renderCustomTimeRangePanel();
      openCustomPanel();

      expect(screen.queryByLabelText('Save as preset')).not.toBeInTheDocument();
    });

    it('calls onPresetSave with the correct bounds and label when Apply is clicked', () => {
      const onPresetSave = jest.fn();
      renderCustomTimeRangePanel({ onPresetSave });
      openCustomPanel();

      const dialog = screen.getByRole('dialog');
      fireEvent.click(within(dialog).getByLabelText('Save as preset'));
      fireEvent.click(within(dialog).getByRole('button', { name: 'Apply' }));

      expect(onPresetSave).toHaveBeenCalledWith({
        start: 'now-15m',
        end: 'now',
        label: '-15m - now',
      });
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
