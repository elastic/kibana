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
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { KeyValueField } from './key_value_field';
import { WidgetType } from '../types';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('KeyValueField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Headers')).toBeDefined();
  });

  it('renders one empty pair by default when value is empty', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByTestId('headers-key-0')).toBeDefined();
    expect(screen.getByTestId('headers-value-0')).toBeDefined();
  });

  it('renders existing key-value pairs', () => {
    const value = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    };

    render(
      <KeyValueField
        fieldId="headers"
        value={value}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const keyInput0 = screen.getByTestId('headers-key-0') as HTMLInputElement;
    const valueInput0 = screen.getByTestId('headers-value-0') as HTMLInputElement;
    const keyInput1 = screen.getByTestId('headers-key-1') as HTMLInputElement;
    const valueInput1 = screen.getByTestId('headers-value-1') as HTMLInputElement;

    expect(keyInput0.value).toBe('Content-Type');
    expect(valueInput0.value).toBe('application/json');
    expect(keyInput1.value).toBe('Authorization');
    expect(valueInput1.value).toBe('Bearer token');
  });

  it('calls onChange when key is modified', async () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const keyInput = screen.getByTestId('headers-key-0');
    fireEvent.change(keyInput, { target: { value: 'Content-Type' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('headers', {
        'Content-Type': '',
      });
    });
  });

  it('calls onChange when value is modified', async () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const keyInput = screen.getByTestId('headers-key-0');
    const valueInput = screen.getByTestId('headers-value-0');

    fireEvent.change(keyInput, { target: { value: 'Content-Type' } });
    fireEvent.change(valueInput, { target: { value: 'application/json' } });

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('headers', {
        'Content-Type': 'application/json',
      });
    });
  });

  it('adds a new pair when add button is clicked', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const addButton = screen.getByTestId('headers-add');
    fireEvent.click(addButton);

    expect(screen.getByTestId('headers-key-0')).toBeDefined();
    expect(screen.getByTestId('headers-key-1')).toBeDefined();
  });

  it('removes a pair when remove button is clicked', async () => {
    const value = {
      'Content-Type': 'application/json',
      Authorization: 'Bearer token',
    };

    render(
      <KeyValueField
        fieldId="headers"
        value={value}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const removeButton = screen.getByTestId('headers-remove-0');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('headers', {
        Authorization: 'Bearer token',
      });
    });
  });

  it('resets to empty pair when last pair is removed', async () => {
    const value = {
      'Content-Type': 'application/json',
    };

    render(
      <KeyValueField
        fieldId="headers"
        value={value}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const removeButton = screen.getByTestId('headers-remove-0');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('headers', {});
    });

    // Should still have one empty pair
    expect(screen.getByTestId('headers-key-0')).toBeDefined();
  });

  it('shows error when key is empty but value is not', async () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const valueInput = screen.getByTestId('headers-value-0');
    fireEvent.change(valueInput, { target: { value: 'some value' } });

    await waitFor(() => {
      expect(screen.getByText('Key cannot be empty')).toBeDefined();
    });
  });

  it('shows error for duplicate keys', async () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const addButton = screen.getByTestId('headers-add');
    fireEvent.click(addButton);

    const keyInput0 = screen.getByTestId('headers-key-0');
    const keyInput1 = screen.getByTestId('headers-key-1');

    fireEvent.change(keyInput0, { target: { value: 'Content-Type' } });
    fireEvent.change(keyInput1, { target: { value: 'Content-Type' } });

    await waitFor(() => {
      expect(screen.getByText('Duplicate key')).toBeDefined();
    });
  });

  it('filters out empty pairs when notifying parent', async () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const addButton = screen.getByTestId('headers-add');
    fireEvent.click(addButton);

    const keyInput0 = screen.getByTestId('headers-key-0');
    const valueInput0 = screen.getByTestId('headers-value-0');

    fireEvent.change(keyInput0, { target: { value: 'Content-Type' } });
    fireEvent.change(valueInput0, { target: { value: 'application/json' } });

    await waitFor(() => {
      // Should only notify with the non-empty pair
      expect(mockOnChange).toHaveBeenCalledWith('headers', {
        'Content-Type': 'application/json',
      });
    });
  });

  it('calls onBlur when field loses focus', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const keyInput = screen.getByTestId('headers-key-0');
    fireEvent.blur(keyInput);

    expect(mockOnBlur).toHaveBeenCalledWith('headers', {});
  });

  it('displays error message from props', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        error="Headers are required"
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Headers are required')).toBeDefined();
  });

  it('updates pairs when value prop changes externally', async () => {
    const { rerender } = render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const newValue = {
      'X-Custom-Header': 'value1',
    };

    rerender(
      <KeyValueField
        fieldId="headers"
        value={newValue}
        label="Headers"
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />
    );

    await waitFor(() => {
      const keyInput = screen.getByTestId('headers-key-0') as HTMLInputElement;
      expect(keyInput.value).toBe('X-Custom-Header');
    });
  });

  it('displays help text when provided in meta', () => {
    render(
      <KeyValueField
        fieldId="headers"
        value={{}}
        label="Headers"
        meta={{ widget: WidgetType.KeyValue, helpText: 'Add HTTP headers' }}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Add HTTP headers')).toBeDefined();
  });
});
