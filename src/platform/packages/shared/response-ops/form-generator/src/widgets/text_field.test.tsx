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
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { TextField } from './text_field';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('TextField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label and placeholder', () => {
    render(
      <TextField
        fieldId="username"
        value=""
        label="Username"
        placeholder="Enter username"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter username')).toBeDefined();
  });

  it('displays the current value', () => {
    render(
      <TextField
        fieldId="username"
        value="testuser"
        label="Username"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByDisplayValue('testuser') as HTMLInputElement;
    expect(input.value).toBe('testuser');
  });

  it('calls onChange when value changes', () => {
    render(
      <TextField
        fieldId="username"
        value=""
        label="Username"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'newvalue' } });

    expect(mockOnChange).toHaveBeenCalledWith('username', 'newvalue');
  });

  it('calls onBlur when field loses focus', () => {
    render(
      <TextField
        fieldId="username"
        value=""
        label="Username"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByLabelText('Username');
    fireEvent.blur(input);

    expect(mockOnBlur).toHaveBeenCalledWith('username');
  });

  it('displays error message when invalid', () => {
    render(
      <TextField
        fieldId="username"
        value=""
        label="Username"
        error="Username is required"
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Username is required')).toBeDefined();
  });

  it('displays multiple error messages', () => {
    render(
      <TextField
        fieldId="username"
        value=""
        label="Username"
        error={['Error 1', 'Error 2']}
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Error 1')).toBeDefined();
    expect(screen.getByText('Error 2')).toBeDefined();
  });
});
