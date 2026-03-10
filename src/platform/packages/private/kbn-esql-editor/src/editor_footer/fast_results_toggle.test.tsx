/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FastResultsToggle } from './fast_results_toggle';
import type { ApproximateResultsControl } from '../types';

describe('FastResultsToggle', () => {
  const createControl = (
    overrides: Partial<ApproximateResultsControl> = {}
  ): ApproximateResultsControl => ({
    enabled: false,
    onChange: jest.fn(),
    ...overrides,
  });

  it('should render the footer button with "off" status when disabled', () => {
    render(<FastResultsToggle approximateResultsControl={createControl()} />);

    const button = screen.getByTestId('ESQLEditor-fastResults-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Fast results: off');
  });

  it('should render the footer button with "on" status when enabled', () => {
    render(<FastResultsToggle approximateResultsControl={createControl({ enabled: true })} />);

    const button = screen.getByTestId('ESQLEditor-fastResults-button');
    expect(button).toHaveTextContent('Fast results: on');
  });

  it('should open the popover when the button is clicked', () => {
    render(<FastResultsToggle approximateResultsControl={createControl()} />);

    fireEvent.click(screen.getByTestId('ESQLEditor-fastResults-button'));

    expect(screen.getByText('Fast Query Analytics')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use approximate execution to return faster, estimated results (\u224890% confidence).'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Results may differ slightly from exact results.')).toBeInTheDocument();
  });

  it('should render the button group with "Off" selected when disabled', () => {
    render(<FastResultsToggle approximateResultsControl={createControl()} />);

    fireEvent.click(screen.getByTestId('ESQLEditor-fastResults-button'));

    expect(screen.getByTestId('ESQLEditor-fastResults-buttonGroup')).toBeInTheDocument();
    expect(screen.getByText('Off').closest('button')).toHaveClass(
      'euiButtonGroupButton-isSelected'
    );
  });

  it('should render the button group with "On" selected when enabled', () => {
    render(<FastResultsToggle approximateResultsControl={createControl({ enabled: true })} />);

    fireEvent.click(screen.getByTestId('ESQLEditor-fastResults-button'));

    expect(screen.getByText('On').closest('button')).toHaveClass('euiButtonGroupButton-isSelected');
  });

  it('should call onChange with true when "On" is clicked', () => {
    const control = createControl();
    render(<FastResultsToggle approximateResultsControl={control} />);

    fireEvent.click(screen.getByTestId('ESQLEditor-fastResults-button'));
    fireEvent.click(screen.getByText('On'));

    expect(control.onChange).toHaveBeenCalledWith(true);
  });

  it('should call onChange with false when "Off" is clicked', () => {
    const control = createControl({ enabled: true });
    render(<FastResultsToggle approximateResultsControl={control} />);

    fireEvent.click(screen.getByTestId('ESQLEditor-fastResults-button'));
    fireEvent.click(screen.getByText('Off'));

    expect(control.onChange).toHaveBeenCalledWith(false);
  });
});
