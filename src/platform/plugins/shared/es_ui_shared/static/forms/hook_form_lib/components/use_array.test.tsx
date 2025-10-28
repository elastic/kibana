/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { useForm } from '../hooks/use_form';
import { useFormData } from '../hooks/use_form_data';
import { Form } from './form';
import { UseField } from './use_field';
import { UseArray } from './use_array';

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('<UseArray />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('it should render by default 1 array item', () => {
    const TestComp = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <UseArray path="myArray">
            {({ items }) => {
              return (
                <>
                  {items.map(({ id }) => {
                    return (
                      <p key={id} data-test-subj="arrayItem">
                        Array item
                      </p>
                    );
                  })}
                </>
              );
            }}
          </UseArray>
        </Form>
      );
    };

    render(<TestComp />);

    const items = screen.getAllByTestId('arrayItem');
    expect(items).toHaveLength(1);
  });

  test('it should allow to listen to array item field value change', async () => {
    const onFormData = jest.fn();

    const TestComp = ({ onData }: { onData: (data: any) => void }) => {
      const { form } = useForm();
      const [formData] = useFormData({ form, watch: 'users[0].name' });

      useEffect(() => {
        onData(formData);
      }, [onData, formData]);

      return (
        <Form form={form}>
          <UseArray path="users">
            {({ items }) => {
              return (
                <>
                  {items.map(({ id, path }) => {
                    return (
                      <UseField key={id} path={`${path}.name`} data-test-subj={`${path}Name`} />
                    );
                  })}
                </>
              );
            }}
          </UseArray>
        </Form>
      );
    };

    render(<TestComp onData={onFormData} />);

    const nameField = await screen.findByTestId('users[0]Name');
    await user.type(nameField, 'John');

    const formData = onFormData.mock.calls[onFormData.mock.calls.length - 1][0];

    expect(formData.users[0].name).toEqual('John');
  });
});
