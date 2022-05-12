/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed } from '../shared_imports';
import { useForm } from '../hooks/use_form';
import { useFormData } from '../hooks/use_form_data';
import { Form } from './form';
import { UseField } from './use_field';
import { UseArray } from './use_array';

describe('<UseArray />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
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

    const setup = registerTestBed(TestComp, {
      memoryRouter: { wrapComponent: false },
    });

    const { find } = setup();

    expect(find('arrayItem').length).toBe(1);
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

    const setup = registerTestBed(TestComp, {
      defaultProps: { onData: onFormData },
      memoryRouter: { wrapComponent: false },
    });

    const {
      form: { setInputValue },
    } = setup();

    await act(async () => {
      setInputValue('users[0]Name', 'John');
    });

    const formData = onFormData.mock.calls[onFormData.mock.calls.length - 1][0];

    expect(formData.users[0].name).toEqual('John');
  });
});
