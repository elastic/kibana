/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { DiscriminatedUnionField } from './discriminated_union_field';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const renderDiscriminatedUnionField = (props: any) => {
  return render(<DiscriminatedUnionField {...props} />, {
    wrapper,
  });
};

describe('DiscriminatedUnionField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all union options as checkable cards', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      option1.meta({ label: 'Basic Auth' }),
      option2.meta({ label: 'OAuth' }),
    ]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    expect(screen.getByText('Authentication')).toBeDefined();
    expect(screen.getByText('Basic Auth')).toBeDefined();
    expect(screen.getByText('OAuth')).toBeDefined();
  });

  it('shows selected option as checked', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      option1.meta({ label: 'Basic Auth' }),
      option2.meta({ label: 'OAuth' }),
    ]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'oauth', token: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const oauthCard = screen.getByLabelText('OAuth', { selector: 'input' }) as HTMLInputElement;
    expect(oauthCard.checked).toBe(true);
  });

  it('renders option fields for selected option', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
      password: z.string().meta({ widget: 'password', label: 'Password' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      option1.meta({ label: 'Basic Auth' }),
      option2.meta({ label: 'OAuth' }),
    ]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: '', password: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByText('Password')).toBeDefined();
    expect(screen.queryByText('Token')).toBeNull();
  });

  it('calls onChange when switching options', async () => {
    const user = userEvent.setup();
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [
      option1.meta({ label: 'Basic Auth' }),
      option2.meta({ label: 'OAuth' }),
    ]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const oauthCard = screen.getByLabelText('OAuth', { selector: 'input' });
    await user.click(oauthCard);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('auth', {
        type: 'oauth',
        token: '',
      });
    });
  });

  it('calls onChange when option field changes', async () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1.meta({ label: 'Basic Auth' })]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const usernameInput = screen.getByRole('textbox');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('auth', { type: 'basic', username: 'testuser' });
    });
  });

  it('validates option fields on blur', async () => {
    const user = userEvent.setup();
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().min(3).meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1.meta({ label: 'Basic Auth' })]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: 'ab' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const usernameInput = screen.getByDisplayValue('ab');
    await user.click(usernameInput);
    await user.tab();

    await waitFor(() => {
      expect(mockOnBlur).toHaveBeenCalledWith('auth.username', { type: 'basic', username: 'ab' });
    });
  });

  it('renders single option union without checkable card', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: { type: 'basic', username: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    expect(screen.queryByLabelText('basic')).toBeNull();

    expect(screen.getByText('Username')).toBeDefined();
  });

  it('handles single option union with field interactions and validation', async () => {
    const option1 = z
      .object({
        type: z.literal('headers'),
        key: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
          widget: 'password',
          label: 'API Key',
        }),
      })
      .meta({
        label: 'Headers',
      });

    const schema = z.discriminatedUnion('type', [option1]);

    renderDiscriminatedUnionField({
      fieldId: 'apiKey',
      value: { type: 'headers', key: '' },
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    expect(screen.getByText('Authentication')).toBeInTheDocument();

    expect(screen.queryByLabelText('Headers')).not.toBeInTheDocument();

    const apiKeyInput = screen.getByTestId('apiKey.key');
    expect(apiKeyInput).toBeInTheDocument();

    // Use a single change event instead of per-character typing to avoid multiple handler calls
    fireEvent.change(apiKeyInput, { target: { value: 'my-secret-api-key' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('apiKey', {
        type: 'headers',
        key: 'my-secret-api-key',
      });
    });

    const user = userEvent.setup();
    await user.click(apiKeyInput);
    await user.tab();

    await waitFor(() => {
      expect(mockOnBlur).toHaveBeenCalled();
    });
  });

  it('selects the first option by default when no default is specified', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const option3 = z.object({
      type: z.literal('apiKey'),
      key: z.string().meta({ widget: 'text', label: 'API Key' }),
    });

    const schema = z.discriminatedUnion('type', [
      option1.meta({ label: 'Basic Auth' }),
      option2.meta({ label: 'OAuth' }),
      option3.meta({ label: 'API Key Auth' }),
    ]);

    const initialValue = {
      type: 'basic',
      username: '',
    };

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: initialValue,
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const basicAuthCard = screen.getByLabelText('Basic Auth', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(basicAuthCard.checked).toBe(true);

    const oauthCard = screen.getByLabelText('OAuth', { selector: 'input' }) as HTMLInputElement;
    const apiKeyCard = screen.getByLabelText('API Key Auth', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(oauthCard.checked).toBe(false);
    expect(apiKeyCard.checked).toBe(false);

    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.queryByText('Token')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
  });

  it('selects the specified default option when default is provided', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const option3 = z.object({
      type: z.literal('apiKey'),
      key: z.string().meta({ widget: 'text', label: 'API Key' }),
    });

    const schema = z
      .discriminatedUnion('type', [
        option1.meta({ label: 'Basic Auth' }),
        option2.meta({ label: 'OAuth' }),
        option3.meta({ label: 'API Key Auth' }),
      ])
      .meta({ default: 'oauth' });

    const initialValue = {
      type: 'oauth',
      token: '',
    };

    renderDiscriminatedUnionField({
      fieldId: 'auth',
      value: initialValue,
      label: 'Authentication',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    const oauthCard = screen.getByLabelText('OAuth', { selector: 'input' }) as HTMLInputElement;
    expect(oauthCard.checked).toBe(true);

    const basicAuthCard = screen.getByLabelText('Basic Auth', {
      selector: 'input',
    }) as HTMLInputElement;
    const apiKeyCard = screen.getByLabelText('API Key Auth', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(basicAuthCard.checked).toBe(false);
    expect(apiKeyCard.checked).toBe(false);

    expect(screen.getByText('Token')).toBeDefined();
    expect(screen.queryByText('Username')).toBeNull();
    expect(screen.queryByText('API Key')).toBeNull();
  });

  it('works with custom discriminator field (not "type")', () => {
    const option1 = z.object({
      kind: z.literal('email'),
      address: z.string().meta({ widget: 'text', label: 'Email Address' }),
    });

    const option2 = z.object({
      kind: z.literal('sms'),
      phone: z.string().meta({ widget: 'text', label: 'Phone Number' }),
    });

    const schema = z.discriminatedUnion('kind', [
      option1.meta({ label: 'Email Notification' }),
      option2.meta({ label: 'SMS Notification' }),
    ]);

    renderDiscriminatedUnionField({
      fieldId: 'notification',
      value: { kind: 'email', address: '' },
      label: 'Notification Method',
      schema,
      onChange: mockOnChange,
      onBlur: mockOnBlur,
    });

    expect(screen.getByText('Notification Method')).toBeDefined();
    expect(screen.getByText('Email Notification')).toBeDefined();
    expect(screen.getByText('SMS Notification')).toBeDefined();

    const emailCard = screen.getByLabelText('Email Notification', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(emailCard.checked).toBe(true);

    expect(screen.getByText('Email Address')).toBeDefined();
    expect(screen.queryByText('Phone Number')).toBeNull();
  });
});
