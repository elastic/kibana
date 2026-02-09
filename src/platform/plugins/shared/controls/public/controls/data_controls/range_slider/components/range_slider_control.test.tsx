/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { fireEvent, render } from '@testing-library/react';

import type { Props as RangeSliderControlProps } from './range_slider_control';
import { RangeSliderControl } from './range_slider_control';
import type { RangeSliderValue } from '@kbn/controls-schemas';

describe('RangeSliderControl', () => {
  const defaultProps: RangeSliderControlProps = {
    compressed: true,
    isInvalid: false,
    isLoading: false,
    fieldName: 'Test field',
    max: 100,
    min: 0,
    step: 1,
    uuid: 'test-uuid',
    value: undefined,
    fieldFormatter: undefined,
    onChange: jest.fn(),
    isEdit: false,
  };

  it('renders range slider without selection', () => {
    const rangeSliderControl = render(<RangeSliderControl {...defaultProps} />);

    expect(rangeSliderControl.getByTestId('range-slider-control-test-uuid')).toBeInTheDocument();
    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveAttribute(
      'placeholder',
      '0'
    );
    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveValue(null);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveAttribute(
      'placeholder',
      '100'
    );
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(null);
    expect(
      rangeSliderControl.queryByTestId('range-slider-control-invalid-append-test-uuid')
    ).toBeFalsy();
    expect(rangeSliderControl.baseElement.querySelector('.euiLoadingSpinner')).toBeFalsy();
  });

  it('renders range slider with only lower bound selection', () => {
    const props = {
      ...defaultProps,
      value: ['10', ''] as RangeSliderValue,
    };

    const rangeSliderControl = render(<RangeSliderControl {...props} />);

    expect(rangeSliderControl.queryByTestId('range-slider-control-test-uuid')).toBeInTheDocument();
    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveValue(10);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(null);
  });

  it('renders range slider with only upper bound selection', () => {
    const props = {
      ...defaultProps,
      value: ['', '80'] as RangeSliderValue,
    };
    const rangeSliderControl = render(<RangeSliderControl {...props} />);

    expect(rangeSliderControl.queryByTestId('range-slider-control-test-uuid')).toBeInTheDocument();
    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveValue(null);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(80);
  });

  it('renders range slider with both bounds selected', () => {
    const props = {
      ...defaultProps,
      value: ['30', '70'] as RangeSliderValue,
    };
    const rangeSliderControl = render(<RangeSliderControl {...props} />);

    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveValue(30);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(70);
  });

  it('renders an invalid indicator when isInvalid is true', () => {
    const props = {
      ...defaultProps,
      isInvalid: true,
      value: ['110', ''] as RangeSliderValue,
    };
    const rangeSliderControl = render(<RangeSliderControl {...props} />);

    expect(
      rangeSliderControl.getByTestId('range-slider-control-invalid-append-test-uuid')
    ).toBeInTheDocument();
  });

  it('renders a loading indicator when isLoading is true', () => {
    const props = {
      ...defaultProps,
      isLoading: true,
      value: ['50', '60'] as RangeSliderValue,
    };
    const rangeSliderControl = render(<RangeSliderControl {...props} />);

    expect(rangeSliderControl.baseElement.querySelector('.euiLoadingSpinner')).toBeInTheDocument();
  });

  it('updates selection when lower bound input changes', async () => {
    const rangeSliderControl = render(<RangeSliderControl {...defaultProps} />);

    const lowerBoundInput = rangeSliderControl.getByTestId(
      'rangeSlider__lowerBoundFieldNumber'
    ) as HTMLInputElement;

    fireEvent.input(lowerBoundInput, {
      target: { value: '40' },
    });

    expect(lowerBoundInput).toHaveValue(40);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(null);
  });

  it('updates selection when upper bound input changes', async () => {
    const rangeSliderControl = render(<RangeSliderControl {...defaultProps} />);

    const upperBoundInput = rangeSliderControl.getByTestId(
      'rangeSlider__upperBoundFieldNumber'
    ) as HTMLInputElement;

    fireEvent.input(upperBoundInput, {
      target: { value: '80' },
    });

    expect(rangeSliderControl.getByTestId('rangeSlider__lowerBoundFieldNumber')).toHaveValue(null);
    expect(rangeSliderControl.getByTestId('rangeSlider__upperBoundFieldNumber')).toHaveValue(80);
  });
});
