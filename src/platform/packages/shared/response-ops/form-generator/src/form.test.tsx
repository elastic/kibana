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
import { Form } from './form';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('Form', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a form with text fields', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
        placeholder: 'Enter username',
      }),
      email: z.string().email().meta({
        widget: 'text',
        label: 'Email',
        placeholder: 'Enter email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders a form with password field', () => {
    const schema = z.object({
      password: z.string().meta({
        widget: 'password',
        label: 'Password',
        placeholder: 'Enter password',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('renders a form with select field', () => {
    const schema = z.object({
      country: z.enum(['US', 'UK', 'CA']).meta({
        widget: 'select',
        label: 'Country',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Country')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'testuser' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: { username: 'testuser' },
      });
    });
  });

  it('displays validation errors on submit with invalid data', async () => {
    const schema = z.object({
      email: z.string().email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates field on blur', async () => {
    const schema = z.object({
      email: z.string().email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument();
    });
  });

  it('clears validation errors when input becomes valid', async () => {
    const schema = z.object({
      email: z.string().email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');

    // Enter invalid email
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(screen.getByText(/Invalid email/i)).toBeInTheDocument();
    });

    // Enter valid email
    fireEvent.change(input, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText(/Invalid email/i)).not.toBeInTheDocument();
    });
  });

  it('resets form after successful submission', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Username') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'testuser' } });
    expect(input.value).toBe('testuser');

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
      expect(input.value).toBe('');
    });
  });

  it('throws error when widget type is missing', () => {
    const schema = z.object({
      username: z.string(),
    });

    // Suppress console errors for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });
    }).toThrow('UI metadata is missing for field: username');

    consoleError.mockRestore();
  });

  it('throws error when unsupported widget type is provided', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'textarea' as any, // Unsupported widget
        label: 'Username',
      }),
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });
    }).toThrow('Unsupported widget type: textarea');

    consoleError.mockRestore();
  });

  it('handles multiple fields with different types', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
      password: z.string().meta({
        widget: 'password',
        label: 'Password',
      }),
      role: z.enum(['admin', 'user']).meta({
        widget: 'select',
        label: 'Role',
        widgetOptions: {
          default: 'user',
        },
      }),
    });

    const { container } = render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, {
      wrapper,
    });

    // Get username input - it's a text input
    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    // Get password input - it has type="password"
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    // Get select
    const roleSelect = screen.getByRole('combobox');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          password: 'password123',
          role: 'admin',
        },
      });
    });
  });

  it('uses default values from widgetOptions', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
        widgetOptions: {
          default: 'defaultUser',
        },
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Username') as HTMLInputElement;
    expect(input.value).toBe('defaultUser');
  });

  it('renders keyValue widget with empty object as initial value', () => {
    const schema = z.object({
      headers: z.record(z.string(), z.string()).meta({
        widget: 'keyValue',
        label: 'Headers',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Headers')).toBeDefined();
  });

  it('handles form submission when onSubmit is not provided', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
    });

    render(<Form connectorSchema={schema} />, { wrapper });

    const input = screen.getByLabelText('Username');
    fireEvent.change(input, { target: { value: 'testuser' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });

    // Should not throw error when onSubmit is undefined
    expect(() => {
      fireEvent.click(submitButton);
    }).not.toThrow();
  });
});

describe('Authentication Form Integration Tests', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authSchema = z.object({
    authType: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('none') }).meta({
          widgetOptions: { label: 'None' },
        }),
        z
          .object({
            type: z.literal('basic'),
            username: z
              .string()
              .min(1, 'Username cannot be empty')
              .meta({
                widget: 'text',
                widgetOptions: { label: 'Username' },
              }),
            password: z
              .string()
              .min(1, 'Password cannot be empty')
              .meta({
                widget: 'password',
                widgetOptions: { label: 'Password' },
              }),
          })
          .meta({
            widgetOptions: { label: 'Basic Auth' },
          }),
        z
          .object({
            type: z.literal('bearer'),
            token: z.string().meta({
              widget: 'text',
              widgetOptions: { label: 'Bearer Token' },
            }),
          })
          .meta({
            widgetOptions: { label: 'Bearer Token' },
          }),
        z
          .object({
            type: z.literal('headers'),
            headers: z.record(z.string().min(1, 'Header key cannot be empty.'), z.string()).meta({
              widget: 'keyValue',
              widgetOptions: {
                label: 'Headers',
              },
            }),
          })
          .meta({
            widgetOptions: { label: 'Headers' },
          }),
      ])
      .meta({
        widget: 'formFieldset',
        widgetOptions: { label: 'Authentication', default: 'none' },
      }),
  });

  it('submits form with headers authentication containing multiple unique headers', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const headersCard = screen.getByLabelText('Headers');
    fireEvent.click(headersCard);

    await waitFor(() => {
      expect(screen.queryByTestId('authType.headers-key-0')).toBeDefined();
    });

    const keyInput0 = screen.getByTestId('authType.headers-key-0');
    const valueInput0 = screen.getByTestId('authType.headers-value-0');
    fireEvent.change(keyInput0, { target: { value: 'Authorization' } });
    fireEvent.change(valueInput0, { target: { value: 'Bearer token123' } });

    const addButton = screen.getByTestId('authType.headers-add');
    fireEvent.click(addButton);

    await waitFor(async () => {
      const key1 = await screen.findByTestId('authType.headers-key-1');
      expect(key1).toBeDefined();
    });

    const keyInput1 = screen.getByTestId('authType.headers-key-1');
    const valueInput1 = screen.getByTestId('authType.headers-value-1');
    fireEvent.change(keyInput1, { target: { value: 'Content-Type' } });
    fireEvent.change(valueInput1, { target: { value: 'application/json' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'headers',
            headers: {
              Authorization: 'Bearer token123',
              'Content-Type': 'application/json',
            },
          },
        },
      });
    });
  });

  it('switches between authentication types correctly', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByLabelText('None')).toBeInTheDocument();

    const basicCard = screen.getByLabelText('Basic Auth');
    fireEvent.click(basicCard);

    await waitFor(() => {
      expect(screen.queryByTestId('authType.username')).toBeDefined();
      expect(screen.queryByTestId('authType.password')).toBeDefined();
    });

    const usernameInput = screen.getByTestId('authType.username');
    const passwordInput = screen.getByTestId('authType.password');
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'basic',
            username: 'testuser',
            password: 'testpass',
          },
        },
      });
    });
  });

  it('submits form with bearer token authentication', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const bearerCard = screen.getByLabelText('Bearer Token');
    fireEvent.click(bearerCard);

    await waitFor(() => {
      expect(screen.queryByTestId('authType.token')).toBeDefined();
    });

    const tokenInput = screen.getByTestId('authType.token');
    fireEvent.change(tokenInput, { target: { value: 'my-secret-token' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'bearer',
            token: 'my-secret-token',
          },
        },
      });
    });
  });

  it('submits form with only valid headers when some keys are empty', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const headersCard = screen.getByLabelText('Headers');
    fireEvent.click(headersCard);

    await waitFor(() => {
      expect(screen.queryByTestId('authType.headers-key-0')).toBeDefined();
    });

    const keyInput0 = screen.getByTestId('authType.headers-key-0');
    const valueInput0 = screen.getByTestId('authType.headers-value-0');
    fireEvent.change(keyInput0, { target: { value: 'Valid-Header' } });
    fireEvent.change(valueInput0, { target: { value: 'valid value' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'headers',
            headers: {
              'Valid-Header': 'valid value',
            },
          },
        },
      });
    });
  });

  it('displays validation errors when submitting basic auth with empty username/password', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    // Select Basic Auth
    const basicCard = screen.getByLabelText('Basic Auth');
    fireEvent.click(basicCard);

    await waitFor(() => {
      expect(screen.queryByTestId('authType.username')).toBeDefined();
      expect(screen.queryByTestId('authType.password')).toBeDefined();
    });

    // Submit without filling in username/password
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Username cannot be empty')).toBeInTheDocument();
      expect(screen.getByText('Password cannot be empty')).toBeInTheDocument();
    });

    // Should not have called onSubmit
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('submits single-option union with full structure', async () => {
    const singleOptionSchema = z.object({
      apiKey: z
        .discriminatedUnion('type', [
          z
            .object({
              type: z.literal('headers'),
              headers: z
                .string()
                .min(1, { message: 'API Key cannot be empty' })
                .meta({
                  widget: 'password',
                  widgetOptions: {
                    label: 'API Key',
                  },
                }),
            })
            .meta({
              widgetOptions: { label: 'Headers' },
            }),
        ])
        .meta({ widget: 'formFieldset', widgetOptions: { label: 'Authentication' } }),
    });

    render(<Form connectorSchema={singleOptionSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const apiKeyInput = screen.getByTestId('apiKey.headers');
    fireEvent.change(apiKeyInput, { target: { value: 'my-secret-api-key' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    // Should submit the full discriminated union structure naturally
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          apiKey: {
            type: 'headers',
            headers: 'my-secret-api-key',
          },
        },
      });
    });
  });
});
