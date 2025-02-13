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

import { NumberParameter } from './number_parameter';

describe('NumberParameter', () => {
  const mockSetParameter = jest.fn();

  const defaultProps = {
    id: 'test-id',
    label: 'Test Label',
    value: 42,
    setParameter: mockSetParameter,
  };

  beforeEach(() => {
    mockSetParameter.mockClear();
  });

  test('renders with correct label and value', () => {
    render(<NumberParameter {...defaultProps} />);

    expect(screen.getByLabelText('Test Label')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  test('calls setParameter with correct arguments on change', () => {
    render(<NumberParameter {...defaultProps} />);

    const input = screen.getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: '100' } });

    expect(mockSetParameter).toHaveBeenCalledWith('test-id', 100);
  });

  test('handles invalid input gracefully', () => {
    render(<NumberParameter {...defaultProps} />);

    const input = screen.getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: 'invalid' } });

    expect(mockSetParameter).toHaveBeenCalledWith('test-id', NaN);
  });
});
