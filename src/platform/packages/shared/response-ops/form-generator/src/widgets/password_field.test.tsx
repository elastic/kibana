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
import { PasswordField } from './password_field';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('PasswordField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label and placeholder', () => {
    render(
      <PasswordField
        fieldId="password"
        value=""
        label="Password"
        placeholder="Enter password"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Password')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter password')).toBeDefined();
  });

  it('displays the current value', () => {
    render(
      <PasswordField
        fieldId="password"
        value="secret123"
        label="Password"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByDisplayValue('secret123') as HTMLInputElement;
    expect(input.value).toBe('secret123');
  });

  it('calls onChange when value changes', () => {
    render(
      <PasswordField
        fieldId="password"
        value=""
        label="Password"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByLabelText('Password');
    fireEvent.change(input, { target: { value: 'newpassword' } });

    expect(mockOnChange).toHaveBeenCalledWith('password', 'newpassword');
  });

  it('calls onBlur when field loses focus', () => {
    render(
      <PasswordField
        fieldId="password"
        value=""
        label="Password"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByLabelText('Password');
    fireEvent.blur(input);

    expect(mockOnBlur).toHaveBeenCalledWith('password');
  });

  it('displays error message when invalid', () => {
    render(
      <PasswordField
        fieldId="password"
        value=""
        label="Password"
        error="Password is required"
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Password is required')).toBeDefined();
  });

  it('renders as password field type', () => {
    render(
      <PasswordField
        fieldId="password"
        value=""
        label="Password"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const input = screen.getByLabelText('Password');
    expect(input).toBeDefined();
  });
});
