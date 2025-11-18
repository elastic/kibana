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
      email: z.email().meta({
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
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates field on blur', async () => {
    const schema = z.object({
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();
  });

  it('clears validation errors when input becomes valid', async () => {
    const schema = z.object({
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email');

    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();

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

  it('throws error when widget type is missing and no default is implemented', () => {
    const schema = z.object({
      // use another one if a default widget is defined for this type
      username: z.object(/^[a-zA-Z0-9_]+$/),
    });

    // Suppress console errors for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });
    }).toThrow('Widget type is required for field: username');

    consoleError.mockRestore();
  });

  it('throws error when unsupported widget type is provided', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'fakeWidget' as any, // Unsupported widget
        label: 'Username',
      }),
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });
    }).toThrow('Unsupported widget type: fakeWidget');

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
        default: 'user',
      }),
    });

    const { container } = render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, {
      wrapper,
    });

    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
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

  it('uses default values from metadata', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
        default: 'defaultUser',
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
          label: 'None',
        }),
        z
          .object({
            type: z.literal('basic'),
            username: z.string().min(1, 'Username cannot be empty').meta({
              widget: 'text',
              label: 'Username',
            }),
            password: z.string().min(1, 'Password cannot be empty').meta({
              widget: 'password',
              label: 'Password',
            }),
          })
          .meta({
            label: 'Basic Auth',
          }),
        z
          .object({
            type: z.literal('bearer'),
            token: z.string().meta({
              widget: 'text',
              label: 'Bearer Token',
            }),
          })
          .meta({
            label: 'Bearer Token',
          }),
        z
          .object({
            type: z.literal('headers'),
            headers: z.record(z.string().min(1, 'Header key cannot be empty.'), z.string()).meta({
              widget: 'keyValue',
              label: 'Headers',
            }),
          })
          .meta({
            label: 'Headers',
          }),
      ])
      .meta({
        widget: 'formFieldset',
        label: 'Authentication',
        default: 'none',
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

    await screen.findByTestId('authType.token');

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

    const basicCard = screen.getByLabelText('Basic Auth');
    fireEvent.click(basicCard);

    await screen.findByTestId('authType.username');
    await screen.findByTestId('authType.password');

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Password cannot be empty')).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows only username error on blur, not password error', async () => {
    render(<Form connectorSchema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const basicCard = screen.getByLabelText('Basic Auth');
    fireEvent.click(basicCard);

    await screen.findByTestId('authType.username');
    await screen.findByTestId('authType.password');

    const usernameInput = screen.getByTestId('authType.username');

    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.blur(usernameInput);

    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();

    expect(screen.queryByText('Password cannot be empty')).not.toBeInTheDocument();
  });

  it('submits single-option union with full structure', async () => {
    const singleOptionSchema = z.object({
      apiKey: z
        .discriminatedUnion('type', [
          z
            .object({
              type: z.literal('headers'),
              headers: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
                widget: 'password',
                label: 'API Key',
              }),
            })
            .meta({
              label: 'Headers',
            }),
        ])
        .meta({ widget: 'formFieldset', label: 'Authentication' }),
    });

    render(<Form connectorSchema={singleOptionSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const apiKeyInput = screen.getByTestId('apiKey.headers');
    fireEvent.change(apiKeyInput, { target: { value: 'my-secret-api-key' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

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

  it('shows all validation errors on submit even after partial blur validation', async () => {
    const schema = z.object({
      name: z.string().min(1, 'Name cannot be empty').meta({
        widget: 'text',
        label: 'Name',
      }),
      authType: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('none') }).meta({
            label: 'None',
          }),
          z
            .object({
              type: z.literal('basic'),
              username: z.string().min(1, 'Username cannot be empty').meta({
                widget: 'text',
                label: 'Username',
              }),
              password: z.string().min(1, 'Password cannot be empty').meta({
                widget: 'password',
                label: 'Password',
              }),
            })
            .meta({
              label: 'Basic Auth',
            }),
        ])
        .meta({
          widget: 'formFieldset',
          label: 'Authentication',
          default: 'none',
        }),
    });

    render(<Form connectorSchema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const basicCard = screen.getByLabelText('Basic Auth');
    fireEvent.click(basicCard);

    await screen.findByTestId('authType.username');
    await screen.findByTestId('authType.password');

    const nameInput = screen.getByTestId('name');
    fireEvent.focus(nameInput);

    const usernameInput = screen.getByTestId('authType.username');
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.blur(usernameInput);

    await screen.findByText('Username cannot be empty');
    expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
    expect(screen.queryByText('Password cannot be empty')).not.toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Name cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Password cannot be empty')).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });
});
