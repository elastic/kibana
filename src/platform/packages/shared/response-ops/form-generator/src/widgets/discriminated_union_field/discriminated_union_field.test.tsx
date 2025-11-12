/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  DiscriminatedUnionField,
  getDiscriminatedUnionInitialValue,
} from './discriminated_union_field';
import { withUIMeta } from '../../connector_spec_ui';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('DiscriminatedUnionField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all union options as checkable cards', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
      withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Authentication')).toBeDefined();
    expect(screen.getByText('Basic Auth')).toBeDefined();
    expect(screen.getByText('OAuth')).toBeDefined();
  });

  it('shows selected option as checked', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
      withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'oauth', token: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const oauthCard = screen.getByLabelText('OAuth') as HTMLInputElement;
    expect(oauthCard.checked).toBe(true);
  });

  it('renders nested fields for selected option', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
      password: withUIMeta(z.string(), { widget: 'password', label: 'Password' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
      withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: '', password: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByText('Password')).toBeDefined();
    expect(screen.queryByText('Token')).toBeNull();
  });

  it('calls onChange when switching options', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
      withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const oauthCard = screen.getByLabelText('OAuth');
    fireEvent.click(oauthCard);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('auth', {
        type: 'oauth',
        token: '',
      });
    });
  });

  it('calls onChange when nested field changes', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // Get the input by its current value (empty string)
    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });

    await waitFor(() => {
      // Widget passes full object to onChange, transformation happens at form submit
      expect(mockOnChange).toHaveBeenCalledWith('auth', { type: 'basic', username: 'testuser' });
    });
  });

  it('validates nested fields on blur', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string().min(3), { widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: 'ab' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const usernameInput = screen.getByDisplayValue('ab');
    fireEvent.blur(usernameInput);

    await waitFor(() => {
      expect(mockOnBlur).toHaveBeenCalledWith('auth');
    });
  });

  it('should not show validation error for untouched fields when tabbing through', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string().min(3), { widget: 'text', label: 'Username' }),
      password: withUIMeta(z.string().min(3), { widget: 'password', label: 'Password' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: 'ab', password: 'xy' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // Initially, no errors should be visible (fields are untouched)
    expect(screen.queryByText(/>=3 characters/i)).toBeNull();

    // Get inputs
    const usernameInput = screen.getByDisplayValue('ab');
    const passwordInput = screen.getByDisplayValue('xy');

    // Blur username - this should trigger validation and show error for username only
    fireEvent.blur(usernameInput);

    await waitFor(() => {
      // Username error should appear (it was touched and is invalid)
      const errors = screen.queryAllByText(/>=3 characters/i);
      expect(errors.length).toBe(1); // Only one error (username), not both
    });

    // Password error should STILL not be visible (password wasn't touched yet)
    // We can verify this by checking the password field itself doesn't have error styling
    const passwordLabel = screen.getByText('Password');
    const passwordFormRow = passwordLabel.closest('.euiFormRow');
    const passwordError = passwordFormRow?.querySelector('.euiFormErrorText');
    expect(passwordError).toBeNull(); // No error text for password yet

    // Now blur password field
    fireEvent.blur(passwordInput);

    // After touching password, its error should also appear
    await waitFor(() => {
      const errors = screen.queryAllByText(/>=3 characters/i);
      expect(errors.length).toBe(2); // Both errors should now be visible
    });
  });

  it('throws error when schema is not ZodDiscriminatedUnion', () => {
    const schema = z.object({
      username: z.string(),
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <DiscriminatedUnionField
          fieldId="auth"
          value={{ username: '' }}
          label="Authentication"
          schema={schema as any}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
        />,
        { wrapper }
      );
    }).toThrow('Schema provided to DiscriminatedUnionField is not a ZodDiscriminatedUnion');

    consoleError.mockRestore();
  });

  it('displays validation errors for nested fields', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string().min(3), { widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
    ]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: 'ab' }}
        label="Authentication"
        schema={schema}
        error={['String must contain at least 3 character(s)']}
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // Touch the username field to trigger validation error display
    const usernameInput = screen.getByTestId('auth.username');
    fireEvent.blur(usernameInput);

    await waitFor(() => {
      // The error message from Zod v4 uses ">=" instead of "at least"
      expect(screen.getByText(/>=3 characters/i)).toBeDefined();
    });
  });

  it('renders single option union without checkable card', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={{ type: 'basic', username: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // Single option union should NOT render checkable card
    expect(screen.queryByLabelText('basic')).toBeNull();

    // But should render the field directly
    expect(screen.getByText('Username')).toBeDefined();
  });

  it('handles single option union with field interactions and validation', async () => {
    const option1 = withUIMeta(
      z.object({
        type: z.literal('headers'),
        key: withUIMeta(z.string().min(1, { message: 'API Key cannot be empty' }), {
          widget: 'password',
          widgetOptions: {
            label: 'API Key',
          },
        }),
      }),
      {
        widgetOptions: { label: 'Headers' },
      }
    );

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <DiscriminatedUnionField
        fieldId="apiKey"
        value={{ type: 'headers', key: '' }}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // Should render fieldset with label
    expect(screen.getByText('Authentication')).toBeInTheDocument();

    // Should NOT render checkable card since there's only one option
    expect(screen.queryByLabelText('Headers')).not.toBeInTheDocument();

    // Should render the password field directly
    const apiKeyInput = screen.getByTestId('apiKey.key');
    expect(apiKeyInput).toBeInTheDocument();

    // Fill in the API key
    fireEvent.change(apiKeyInput, { target: { value: 'my-secret-api-key' } });

    await waitFor(() => {
      // Widget passes full object to onChange, transformation happens at form submit
      expect(mockOnChange).toHaveBeenCalledWith('apiKey', {
        type: 'headers',
        key: 'my-secret-api-key',
      });
    });

    // Blur the field
    fireEvent.blur(apiKeyInput);

    await waitFor(() => {
      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  it('selects the first option by default when no default is specified', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const option3 = z.object({
      type: z.literal('apiKey'),
      key: withUIMeta(z.string(), { widget: 'text', label: 'API Key' }),
    });

    const schema = z.discriminatedUnion('type', [
      withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
      withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
      withUIMeta(option3, { widgetOptions: { label: 'API Key Auth' } }),
    ]);

    // Get the default initial value (should be first option)
    const initialValue = getDiscriminatedUnionInitialValue(schema);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={initialValue}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // First option should be checked
    const basicAuthCard = screen.getByLabelText('Basic Auth') as HTMLInputElement;
    expect(basicAuthCard.checked).toBe(true);

    // Other options should not be checked
    const oauthCard = screen.getByLabelText('OAuth') as HTMLInputElement;
    const apiKeyCard = screen.getByLabelText('API Key Auth') as HTMLInputElement;
    expect(oauthCard.checked).toBe(false);
    expect(apiKeyCard.checked).toBe(false);

    // Should render nested fields for the first option
    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.queryByText('Token')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
  });

  it('selects the specified default option when default is provided', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: withUIMeta(z.string(), { widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: withUIMeta(z.string(), { widget: 'text', label: 'Token' }),
    });

    const option3 = z.object({
      type: z.literal('apiKey'),
      key: withUIMeta(z.string(), { widget: 'text', label: 'API Key' }),
    });

    const schema = withUIMeta(
      z.discriminatedUnion('type', [
        withUIMeta(option1, { widgetOptions: { label: 'Basic Auth' } }),
        withUIMeta(option2, { widgetOptions: { label: 'OAuth' } }),
        withUIMeta(option3, { widgetOptions: { label: 'API Key Auth' } }),
      ]),
      { widgetOptions: { default: 'oauth' } }
    );

    // Get the default initial value (should be the specified default option)
    const initialValue = getDiscriminatedUnionInitialValue(schema);

    render(
      <DiscriminatedUnionField
        fieldId="auth"
        value={initialValue}
        label="Authentication"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    // OAuth (the default) should be checked
    const oauthCard = screen.getByLabelText('OAuth') as HTMLInputElement;
    expect(oauthCard.checked).toBe(true);

    // Other options should not be checked
    const basicAuthCard = screen.getByLabelText('Basic Auth') as HTMLInputElement;
    const apiKeyCard = screen.getByLabelText('API Key Auth') as HTMLInputElement;
    expect(basicAuthCard.checked).toBe(false);
    expect(apiKeyCard.checked).toBe(false);

    // Should render nested fields for the default option (OAuth)
    expect(screen.getByText('Token')).toBeDefined();
    expect(screen.queryByText('Username')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
  });
});

describe('getDiscriminatedUnionInitialValue', () => {
  it('returns initial value from first option when no default provided', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string(),
      password: z.string(),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string(),
    });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    const result = getDiscriminatedUnionInitialValue(schema);

    expect(result).toEqual({
      type: 'basic',
      username: '',
      password: '',
    });
  });

  it('returns initial value matching the default discriminator value', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string(),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string(),
    });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    const result = getDiscriminatedUnionInitialValue(schema, 'oauth');

    expect(result).toEqual({
      type: 'oauth',
      token: '',
    });
  });

  it('returns first option when default does not match any option', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string(),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string(),
    });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    const result = getDiscriminatedUnionInitialValue(schema, 'nonexistent');

    expect(result).toEqual({
      type: 'basic',
      username: '',
    });
  });

  it('throws error when schema is not ZodDiscriminatedUnion', () => {
    const schema = z.object({
      username: z.string(),
    });

    expect(() => {
      getDiscriminatedUnionInitialValue(schema as any);
    }).toThrow('Schema provided is not a ZodDiscriminatedUnion');
  });

  it('handles number fields with default value 0', () => {
    const option1 = z.object({
      type: z.literal('config'),
      port: z.number(),
      timeout: z.number(),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    const result = getDiscriminatedUnionInitialValue(schema);

    expect(result).toEqual({
      type: 'config',
      port: 0,
      timeout: 0,
    });
  });

  it('handles boolean fields with default value false', () => {
    const option1 = z.object({
      type: z.literal('settings'),
      enabled: z.boolean(),
      debug: z.boolean(),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    const result = getDiscriminatedUnionInitialValue(schema);

    expect(result).toEqual({
      type: 'settings',
      enabled: false,
      debug: false,
    });
  });

  it('handles array fields with default empty array', () => {
    const option1 = z.object({
      type: z.literal('config'),
      tags: z.array(z.string()),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    const result = getDiscriminatedUnionInitialValue(schema);

    expect(result).toEqual({
      type: 'config',
      tags: [],
    });
  });

  it('handles object fields with default empty object', () => {
    const option1 = z.object({
      type: z.literal('config'),
      metadata: z.object({ key: z.string() }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    const result = getDiscriminatedUnionInitialValue(schema);

    expect(result).toEqual({
      type: 'config',
      metadata: {},
    });
  });
});
