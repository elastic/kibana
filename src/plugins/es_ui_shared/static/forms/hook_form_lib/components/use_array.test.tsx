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
                      <UseField
                        key={id}
                        path={`${path}.name`}
                        data-test-subj={`nameField__${id}`}
                      />
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
      setInputValue('nameField__0', 'John');
    });

    const formData = onFormData.mock.calls[onFormData.mock.calls.length - 1][0];

    expect(formData.users[0].name).toEqual('John');
  });
});
