/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { StringParameter, StringParameterProps } from './string_parameter';

describe('StringParameter component', () => {
  const mockSetParameter = jest.fn();
  const defaultProps: StringParameterProps = {
    id: 'test-id',
    label: 'Test Label',
    value: 'Initial Value',
    setParameter: mockSetParameter,
  };

  beforeEach(() => {
    mockSetParameter.mockClear();
  });

  test('renders with correct label and value', () => {
    const { getByLabelText, getByDisplayValue } = render(<StringParameter {...defaultProps} />);

    expect(getByLabelText('Test Label')).toBeInTheDocument();
    expect(getByDisplayValue('Initial Value')).toBeInTheDocument();
  });

  test('calls setParameter with correct arguments on change', () => {
    const { getByLabelText } = render(<StringParameter {...defaultProps} />);
    const input = getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: 'New Value' } });

    expect(mockSetParameter).toHaveBeenCalledWith('test-id', 'New Value');
  });

  test('handles empty input gracefully', () => {
    const { getByLabelText } = render(<StringParameter {...defaultProps} />);
    const input = getByLabelText('Test Label');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockSetParameter).toHaveBeenCalledWith('test-id', '');
  });
});
