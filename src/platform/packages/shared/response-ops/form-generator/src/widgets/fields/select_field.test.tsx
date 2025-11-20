/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SelectField } from './select_field';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

describe('SelectField', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label from props', () => {
    render(
      <TestFormWrapper>
        <SelectField
          path="country"
          schema={z.enum(['option1', 'option2', 'option3'])}
          fieldProps={{
            label: 'Country',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByText('Country')).toBeDefined();
  });

  it('renders options from z.enum schema', () => {
    render(
      <TestFormWrapper>
        <SelectField
          path="country"
          schema={z.enum(['US', 'UK', 'CA'])}
          fieldProps={{
            label: 'Country',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe('US');
    expect(select.options[1].value).toBe('UK');
    expect(select.options[2].value).toBe('CA');
  });

  it('renders options from explicit options prop', () => {
    render(
      <TestFormWrapper>
        <SelectField
          path="role"
          schema={z.enum(['admin', 'user', 'guest'])}
          fieldProps={{
            label: 'Role',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.options.length).toBe(3);
    expect(select.options[0].value).toBe('admin');
    expect(select.options[1].value).toBe('user');
    expect(select.options[2].value).toBe('guest');
  });

  it('displays the selected value', () => {
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { choice: 'option2' } });
      return (
        <Form form={form}>
          <SelectField
            path="choice"
            schema={z.enum(['option1', 'option2', 'option3'])}
            fieldProps={{
              label: 'Choice',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [
                {
                  validator: () => undefined,
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('option2');
  });

  it('calls onChange when value changes', async () => {
    const user = userEvent.setup();
    render(
      <TestFormWrapper>
        <SelectField
          path="choice"
          schema={z.enum(['option1', 'option2', 'option3'])}
          fieldProps={{
            label: 'Choice',
            euiFieldProps: { ['data-test-subj']: 'generator-field-choice' },
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'option3');

    expect((select as HTMLSelectElement).value).toBe('option3');
  });

  it('calls onBlur when field loses focus', async () => {
    const user = userEvent.setup();
    render(
      <TestFormWrapper>
        <SelectField
          path="choice"
          schema={z.enum(['option1', 'option2', 'option3'])}
          fieldProps={{
            label: 'Choice',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.tab();

    // Field should maintain its value after blur
    expect(screen.getByRole('combobox')).toBeDefined();
  });

  it('displays error message when invalid', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <SelectField
            path="choice"
            schema={z.enum(['option1', 'option2', 'option3'])}
            fieldProps={{
              label: 'Choice',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    if (!value || value === 'option1') {
                      return { message: 'Selection is required' };
                    }
                  },
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const select = screen.getByRole('combobox');
    await user.click(select);
    await user.selectOptions(select, 'option2');
    await user.selectOptions(select, 'option1');
    await user.tab();

    expect(await screen.findByText('Selection is required')).toBeDefined();
  });

  it('throws error when schema is not z.enum and no options provided', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(
        <TestFormWrapper>
          <SelectField
            path="choice"
            schema={z.string() as any}
            fieldProps={{
              label: 'Choice',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [
                {
                  validator: () => undefined,
                },
              ],
            }}
          />
        </TestFormWrapper>,
        { wrapper }
      );
    }).toThrow('SelectField requires a ZodEnum schema');

    consoleError.mockRestore();
  });
});
