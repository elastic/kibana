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
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { SelectField } from './select_field';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('SelectField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label from props', () => {
    const schema = z.enum(['option1', 'option2', 'option3']);

    render(
      <SelectField
        fieldId="country"
        value="option1"
        label="Country"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Country')).toBeDefined();
  });

  it('renders options from z.enum schema', () => {
    const schema = z.enum(['US', 'UK', 'CA']);

    render(
      <SelectField
        fieldId="country"
        value="US"
        label="Country"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe('US');
    expect(select.options[1].value).toBe('UK');
    expect(select.options[2].value).toBe('CA');
  });

  it('renders options from explicit options prop', () => {
    const options = [
      { value: 'admin', text: 'Administrator' },
      { value: 'user', text: 'User' },
      { value: 'guest', text: 'Guest' },
    ];

    render(
      <SelectField
        fieldId="role"
        value="admin"
        label="Role"
        options={options}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe('admin');
    expect(select.options[0].text).toBe('Administrator');
  });

  it('displays the selected value', () => {
    const schema = z.enum(['option1', 'option2', 'option3']);

    render(
      <SelectField
        fieldId="choice"
        value="option2"
        label="Choice"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('calls onChange when value changes', () => {
    const schema = z.enum(['option1', 'option2', 'option3']);

    render(
      <SelectField
        fieldId="choice"
        value="option1"
        label="Choice"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option3' } });

    expect(mockOnChange).toHaveBeenCalledWith('choice', 'option3');
  });

  it('calls onBlur when field loses focus', () => {
    const schema = z.enum(['option1', 'option2', 'option3']);

    render(
      <SelectField
        fieldId="choice"
        value="option1"
        label="Choice"
        schema={schema}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    const select = screen.getByRole('combobox');
    fireEvent.blur(select);

    expect(mockOnBlur).toHaveBeenCalledWith('choice');
  });

  it('displays error message when invalid', () => {
    const schema = z.enum(['option1', 'option2', 'option3']);

    render(
      <SelectField
        fieldId="choice"
        value=""
        label="Choice"
        schema={schema}
        error="Selection is required"
        isInvalid={true}
        onChange={mockOnChange}
        onBlur={mockOnBlur}
      />,
      { wrapper }
    );

    expect(screen.getByText('Selection is required')).toBeDefined();
  });

  it('throws error when schema is not z.enum and no options provided', () => {
    const schema = z.string();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <SelectField
          fieldId="choice"
          value=""
          label="Choice"
          schema={schema}
          onChange={mockOnChange}
          onBlur={mockOnBlur}
        />,
        { wrapper }
      );
    }).toThrow('SelectField requires z.enum() schema or explicit options prop');

    consoleError.mockRestore();
  });
});
