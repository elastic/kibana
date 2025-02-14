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
import { ParameterForm, ParameterFormProps } from './parameter_form';

describe('ParameterForm', () => {
  const mockSetParameter = jest.fn();

  beforeEach(() => {
    mockSetParameter.mockClear();
  });

  test('renders and interacts with NumberParameter correctly', () => {
    const numberProps: ParameterFormProps = {
      params: [{ id: 'id-1', label: 'Parameter 1', type: 'number' }],
      paramValues: { 'id-1': 42 },
      setParameter: mockSetParameter,
    };

    const { getByLabelText, getByDisplayValue } = render(<ParameterForm {...numberProps} />);

    const numberInput = getByLabelText('Parameter 1');

    expect(numberInput).toBeInTheDocument();
    expect(getByDisplayValue('42')).toBeInTheDocument();

    fireEvent.change(numberInput, { target: { value: '100' } });
    expect(mockSetParameter).toHaveBeenCalledWith('id-1', 100);
  });

  test('renders and interacts with StringParameter correctly', () => {
    const stringProps: ParameterFormProps = {
      params: [{ id: 'id-2', label: 'Parameter 2', type: 'string' }],
      paramValues: { 'id-2': 'Initial Value' },
      setParameter: mockSetParameter,
    };

    const { getByLabelText, getByDisplayValue } = render(<ParameterForm {...stringProps} />);

    const stringInput = getByLabelText('Parameter 2');

    expect(stringInput).toBeInTheDocument();
    expect(getByDisplayValue('Initial Value')).toBeInTheDocument();

    fireEvent.change(stringInput, { target: { value: 'New Value' } });
    expect(mockSetParameter).toHaveBeenCalledWith('id-2', 'New Value');
  });
});
