/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor, act, within } from '@testing-library/react';
import { renderWithEuiTheme } from '@kbn/test-jest-helpers';
import { EuiThemeProvider } from '@elastic/eui';

import { FOCUSABLE_SELECTOR } from './constants';
import { DateRangePicker, type DateRangePickerProps } from './date_range_picker';

const defaultProps: DateRangePickerProps = {
  defaultValue: 'last 20 minutes',
  onChange: () => {},
  settings: { roundRelativeTime: false },
  onSettingsChange: () => {},
};

const openEditing = () => {
  fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
  return screen.getByTestId('dateRangePickerInput');
};

/** Flush EuiPopover's internal 250ms close-transition setTimeout. */
const waitForPopoverClose = () =>
  waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

describe('DateRangePickerControl', () => {
  describe('editing mode', () => {
    it('enters editing mode on control button click', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={() => {}} />);

      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();

      const input = openEditing();

      expect(input).toHaveFocus();
      expect(screen.queryByTestId('dateRangePickerControlButton')).not.toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });
      await waitForPopoverClose();
    });

    it('submits on Enter and returns to idle mode', async () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      const input = openEditing();

      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
      await waitForPopoverClose();
    });

    it('cancels on Escape and returns to idle mode', async () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      const input = openEditing();

      fireEvent.keyDown(input, { key: 'Escape' });

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
      await waitForPopoverClose();
    });

    it('restores previous text on Escape after typing', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const input = openEditing();

      fireEvent.change(input, { target: { value: 'something else' } });
      fireEvent.keyDown(input, { key: 'Escape' });

      const button = screen.getByTestId('dateRangePickerControlButton');
      expect(button).toHaveTextContent('Last 20 minutes');
      await waitForPopoverClose();
    });

    it('calls onInputChange when typing and clearing input', async () => {
      const onInputChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onInputChange={onInputChange} />);

      const input = openEditing();
      fireEvent.change(input, { target: { value: 'last 15 minutes' } });

      expect(onInputChange).toHaveBeenCalledWith('last 15 minutes');

      fireEvent.click(screen.getByLabelText('Clear input'));
      expect(onInputChange).toHaveBeenCalledWith('');

      fireEvent.keyDown(screen.getByTestId('dateRangePickerInput'), { key: 'Escape' });
      await waitForPopoverClose();
    });

    it('closes on outside click and returns to idle mode', async () => {
      const onChange = jest.fn();
      renderWithEuiTheme(<DateRangePicker {...defaultProps} onChange={onChange} />);

      openEditing();

      fireEvent.mouseDown(document.body);
      fireEvent.mouseUp(document.body);

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
      await waitForPopoverClose();
    });

    it('exits editing and restores text on Shift+Tab from the first tabbable', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const input = openEditing();
      fireEvent.change(input, { target: { value: 'something else' } });
      fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });

      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent(
        'Last 20 minutes'
      );
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
      await waitForPopoverClose();
    });

    it('exits editing and restores text on Tab from the last tabbable', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const input = openEditing();
      fireEvent.change(input, { target: { value: 'something else' } });

      const clearButton = screen.getByLabelText('Clear input');
      clearButton.focus();
      fireEvent.keyDown(clearButton, { key: 'Tab' });

      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent(
        'Last 20 minutes'
      );
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
      await waitForPopoverClose();
    });

    it.each(['ArrowDown', 'ArrowUp'] as const)(
      'moves focus into the dialog on %s and back to button on Escape',
      async (arrowKey) => {
        renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

        const input = openEditing();
        fireEvent.keyDown(input, { key: arrowKey });

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveFocus();

        fireEvent.keyDown(dialog, { key: 'Escape' });

        expect(screen.getByTestId('dateRangePickerControlButton')).toHaveFocus();
        await waitForPopoverClose();
      }
    );

    it('traps focus within the dialog panel on Tab', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const input = openEditing();
      fireEvent.keyDown(input, { key: 'ArrowDown' });

      const dialog = screen.getByRole('dialog');
      const tabbables = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      expect(tabbables.length).toBeGreaterThan(0);

      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];

      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(first).toHaveFocus();

      fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
      expect(last).toHaveFocus();

      fireEvent.keyDown(dialog, { key: 'Escape' });
      await waitForPopoverClose();
    });

    it('opens popover when entering editing mode and closes it when exiting', async () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      const input = openEditing();

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      fireEvent.keyDown(input, { key: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('collapsed prop', () => {
    it('shows the label and omits aria-label when not collapsed (default)', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);

      const button = screen.getByTestId('dateRangePickerControlButton');
      expect(button).not.toHaveAttribute('aria-label');
      expect(button).toHaveTextContent('Last 20 minutes');
    });

    it('hides the label and sets aria-label when collapsed', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} collapsed />);

      const button = screen.getByTestId('dateRangePickerControlButton');
      expect(button).toHaveAttribute('aria-label');
      expect(button).not.toHaveTextContent('Last 20 minutes');
    });
  });

  describe('disabled prop', () => {
    it('disables the control button and suppresses tooltip', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} disabled />);

      const button = screen.getByTestId('dateRangePickerControlButton');
      expect(button).toBeDisabled();

      fireEvent.mouseOver(button);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('does not enter editing mode when disabled', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} disabled />);

      fireEvent.click(screen.getByTestId('dateRangePickerControlButton'));
      expect(screen.queryByTestId('dateRangePickerInput')).not.toBeInTheDocument();
    });
  });

  describe('controlled mode (value prop)', () => {
    const controlledDefaults = {
      settings: { roundRelativeTime: false },
      onSettingsChange: () => {},
    } as const;

    const renderPicker = (props: DateRangePickerProps) =>
      renderWithEuiTheme(<DateRangePicker {...props} />);

    it('renders with initial value', () => {
      renderPicker({ value: 'last 20 minutes', onChange: () => {}, ...controlledDefaults });
      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent(
        'Last 20 minutes'
      );
    });

    it('updates displayed text when value changes while idle', async () => {
      const { rerender } = renderPicker({
        value: 'last 20 minutes',
        onChange: () => {},
        ...controlledDefaults,
      });
      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent(
        'Last 20 minutes'
      );

      rerender(<DateRangePicker value="last 1 hour" onChange={() => {}} {...controlledDefaults} />);
      await waitFor(() => {
        expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent('Last 1 hour');
      });
    });

    it('does not overwrite user input when value changes during editing', async () => {
      const { rerender } = renderPicker({
        value: 'last 20 minutes',
        onChange: () => {},
        ...controlledDefaults,
      });
      const input = openEditing();
      fireEvent.change(input, { target: { value: 'last 5 minutes' } });
      expect(input).toHaveValue('last 5 minutes');

      rerender(<DateRangePicker value="last 1 hour" onChange={() => {}} {...controlledDefaults} />);
      await waitFor(() => {
        expect(input).toHaveValue('last 5 minutes');
      });

      fireEvent.keyDown(input, { key: 'Escape' });
      await waitForPopoverClose();
    });

    it('restores to latest value on cancel after external value change during editing', async () => {
      const { rerender } = renderPicker({
        value: 'last 20 minutes',
        onChange: () => {},
        ...controlledDefaults,
      });
      const input = openEditing();
      fireEvent.change(input, { target: { value: 'something typed' } });

      await act(async () =>
        rerender(
          <DateRangePicker value="last 1 hour" onChange={() => {}} {...controlledDefaults} />
        )
      );
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent('Last 1 hour');
      await waitForPopoverClose();
    });

    it('calls onChange on Enter in controlled mode', async () => {
      const onChange = jest.fn();
      renderPicker({ value: 'last 20 minutes', onChange, ...controlledDefaults });

      const input = openEditing();
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('dateRangePickerControlButton')).toBeInTheDocument();
      await waitForPopoverClose();
    });

    it('preserves text when controlled value is removed', () => {
      const Harness = () => {
        const [controlled, setControlled] = useState(true);
        return (
          <EuiThemeProvider>
            <button data-test-subj="toggle" onClick={() => setControlled(false)} />
            <DateRangePicker
              {...(controlled ? { value: 'last 1 hour' } : {})}
              onChange={() => {}}
              settings={{ roundRelativeTime: false }}
              onSettingsChange={() => {}}
            />
          </EuiThemeProvider>
        );
      };
      render(<Harness />);
      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent('Last 1 hour');

      fireEvent.click(screen.getByTestId('toggle'));
      expect(screen.getByTestId('dateRangePickerControlButton')).toHaveTextContent('Last 1 hour');
    });
  });

  describe('width prop', () => {
    it('auto (default)', () => {
      const { container } = renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      const computedStyles = getComputedStyle(container.firstElementChild!);
      expect(computedStyles.display).toBe('inline-flex');
      expect(computedStyles.inlineSize).toBe('auto');
    });

    it('restricted', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} width="restricted" />);
      const wrapper = screen.getByTestId('dateRangePickerControlWrapper');
      expect(wrapper).toHaveStyle({
        'inline-size': 'var(--kbnDateRangePickerWidth, 21.25rem)',
      });
    });

    it('full', () => {
      const { container } = renderWithEuiTheme(<DateRangePicker {...defaultProps} width="full" />);
      expect(container.firstElementChild).toHaveStyle({ display: 'flex', 'inline-size': '100%' });
      const popover = screen.getByTestId('dateRangePickerDialogTriggerWrapper');
      expect(popover).toHaveStyle({ 'inline-size': '100%' });
    });
  });

  describe('isLoading prop', () => {
    it('shows a loading spinner when isLoading is true', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} isLoading />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not show a spinner when isLoading is false (default)', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} />);
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
  });

  describe('layout passthrough props', () => {
    it('passes className to the outer container', () => {
      const { container } = renderWithEuiTheme(
        <DateRangePicker {...defaultProps} className="my-custom-class" />
      );
      expect(container.firstElementChild).toHaveClass('my-custom-class');
    });

    it('passes data-test-subj to the outer container', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} data-test-subj="myPicker" />);
      expect(screen.getByTestId('myPicker')).toBeInTheDocument();
    });
  });

  describe('badge fallback', () => {
    it('renders "--" when the duration cannot be computed', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} defaultValue="invalid input" />);
      const button = screen.getByTestId('dateRangePickerControlButton');
      const badge = within(button).getByText('--');
      expect(badge).toBeInTheDocument();
    });

    it('renders a duration label when the range is valid', () => {
      renderWithEuiTheme(<DateRangePicker {...defaultProps} defaultValue="last 20 minutes" />);
      const button = screen.getByTestId('dateRangePickerControlButton');
      const badge = within(button).getByText('20min');
      expect(badge).toBeInTheDocument();
    });
  });
});
