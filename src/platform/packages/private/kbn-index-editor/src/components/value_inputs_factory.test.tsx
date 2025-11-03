/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import {
  BooleanInput,
  getInputComponentForType,
  NumberInput,
  StringInput,
} from './value_inputs_factory';

describe('getInputComponentForType', () => {
  it('returns NumberInput for "number" type', () => {
    const Component = getInputComponentForType('number');
    expect(Component).toBe(NumberInput);
  });

  it('returns BooleanInput for "boolean" type', () => {
    const Component = getInputComponentForType('boolean');
    expect(Component).toBe(BooleanInput);
  });

  it('returns StringInput for "string" type', () => {
    const Component = getInputComponentForType('string');
    expect(Component).toBe(StringInput);
  });

  it('returns StringInput for undefined type', () => {
    const Component = getInputComponentForType(undefined);
    expect(Component).toBe(StringInput);
  });
});

describe('BooleanInput', () => {
  it('calls onChange and onError with null for valid boolean "true"', () => {
    const handleChange = jest.fn();
    const handleError = jest.fn();
    renderWithI18n(<BooleanInput value="" onChange={handleChange} onError={handleError} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'true' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(null);
  });

  it('calls onChange and onError with null for valid boolean "false"', () => {
    const handleChange = jest.fn();
    const handleError = jest.fn();
    renderWithI18n(<BooleanInput value="" onChange={handleChange} onError={handleError} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'false' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(null);
  });

  it('calls onChange and onError with an error for invalid boolean', () => {
    const handleChange = jest.fn();
    const handleError = jest.fn();
    renderWithI18n(<BooleanInput value="" onChange={handleChange} onError={handleError} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'invalid' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith('Value must be true or false');
    expect(input).toBeInvalid();
  });

  it('handles case-insensitivity', () => {
    const handleChange = jest.fn();
    const handleError = jest.fn();
    renderWithI18n(<BooleanInput value="" onChange={handleChange} onError={handleError} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'TRUE' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleError).toHaveBeenCalledWith(null);
    expect(input).not.toBeInvalid();
  });
});
