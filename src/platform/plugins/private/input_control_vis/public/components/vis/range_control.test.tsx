/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { RangeControl, ceilWithPrecision, floorWithPrecision } from './range_control';
import type { RangeControl as RangeControlClass } from '../../control/range_control_factory';

const control: RangeControlClass = {
  id: 'mock-range-control',
  isEnabled: () => {
    return true;
  },
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  type: 'range',
  label: 'range control',
  value: { min: 0, max: 100 },
  min: 0,
  max: 100,
  hasValue: () => {
    return true;
  },
} as RangeControlClass;

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

test('renders RangeControl', () => {
  renderWithIntl(<RangeControl control={control} controlIndex={0} stageFilter={() => {}} />);

  expect(screen.getByTestId('inputControl0')).toBeInTheDocument();
  expect(screen.getByText('range control')).toBeInTheDocument();

  // Check for range inputs
  const rangeInputs = screen.getAllByRole('spinbutton');
  expect(rangeInputs).toHaveLength(2); // min and max inputs

  // Check that inputs have correct accessibility labels
  expect(screen.getByLabelText('Range minimum')).toBeInTheDocument();
  expect(screen.getByLabelText('Range maximum')).toBeInTheDocument();
});

test('disabled', () => {
  const disabledRangeControl: RangeControlClass = {
    id: 'mock-range-control',
    isEnabled: () => {
      return false;
    },
    options: {
      decimalPlaces: 0,
      step: 1,
    },
    type: 'range',
    label: 'range control',
    disabledReason: 'control is disabled to test rendering when disabled',
    value: { min: 0, max: 100 },
    min: 0,
    max: 100,
    hasValue: () => {
      return true;
    },
  } as RangeControlClass;

  renderWithIntl(
    <RangeControl control={disabledRangeControl} controlIndex={0} stageFilter={() => {}} />
  );

  expect(screen.getByTestId('inputControl0')).toBeInTheDocument();
  expect(screen.getByText('range control')).toBeInTheDocument();

  // Check for disabled state - ValidatedDualRange should be disabled
  const rangeInputs = screen.getAllByRole('spinbutton');
  expect(rangeInputs).toHaveLength(2);
  rangeInputs.forEach((input) => {
    expect(input).toBeDisabled();
  });
});

test('ceilWithPrecision', () => {
  expect(ceilWithPrecision(999.133, 0)).toBe(1000);
  expect(ceilWithPrecision(999.133, 2)).toBe(999.14);
});

test('floorWithPrecision', () => {
  expect(floorWithPrecision(100.777, 0)).toBe(100);
  expect(floorWithPrecision(100.777, 2)).toBe(100.77);
});
