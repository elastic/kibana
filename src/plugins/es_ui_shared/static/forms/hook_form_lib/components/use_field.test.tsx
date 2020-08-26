/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed } from '../shared_imports';
import { FormHook, OnUpdateHandler, FieldConfig } from '../types';
import { useForm } from '../hooks/use_form';
import { Form } from './form';
import { UseField } from './use_field';

describe('<UseField />', () => {
  test('should read the default value from the prop and fallback to the config object', () => {
    const onFormData = jest.fn();

    const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
      const { form } = useForm();
      const { subscribe } = form;

      useEffect(() => subscribe(onData).unsubscribe, [subscribe, onData]);

      return (
        <Form form={form}>
          <UseField path="name" config={{ defaultValue: 'John' }} />
          <UseField
            path="lastName"
            defaultValue="Snow"
            config={{ defaultValue: 'Will be Overridden' }}
          />
        </Form>
      );
    };

    const setup = registerTestBed(TestComp, {
      defaultProps: { onData: onFormData },
      memoryRouter: { wrapComponent: false },
    });

    setup();

    const [{ data }] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
      OnUpdateHandler
    >;

    expect(data.raw).toEqual({
      name: 'John',
      lastName: 'Snow',
    });
  });

  describe('serializer(), deserializer(), formatter()', () => {
    interface MyForm {
      name: string;
    }

    const serializer = jest.fn();
    const deserializer = jest.fn();
    const formatter = jest.fn();

    const fieldConfig: FieldConfig = {
      defaultValue: '',
      serializer,
      deserializer,
      formatters: [formatter],
    };

    let formHook: FormHook<MyForm> | null = null;

    beforeEach(() => {
      formHook = null;
      serializer.mockReset().mockImplementation((value) => `${value}-serialized`);
      deserializer.mockReset().mockImplementation((value) => `${value}-deserialized`);
      formatter.mockReset().mockImplementation((value: string) => value.toUpperCase());
    });

    const onFormHook = (_form: FormHook<MyForm>) => {
      formHook = _form;
    };

    const TestComp = ({ onForm }: { onForm: (form: FormHook<MyForm>) => void }) => {
      const { form } = useForm<MyForm>({ defaultValue: { name: 'John' } });

      useEffect(() => {
        onForm(form);
      }, [onForm, form]);

      return (
        <Form form={form}>
          <UseField path="name" config={fieldConfig} data-test-subj="myField" />
        </Form>
      );
    };

    test('should call each handler at expected lifecycle', async () => {
      const setup = registerTestBed(TestComp, {
        memoryRouter: { wrapComponent: false },
        defaultProps: { onForm: onFormHook },
      });

      const testBed = setup() as TestBed;

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      const { form } = testBed;

      expect(deserializer).toBeCalled();
      expect(serializer).not.toBeCalled();
      expect(formatter).not.toBeCalled();

      let formData = formHook.getFormData({ unflatten: false });
      expect(formData.name).toEqual('John-deserialized');

      await act(async () => {
        form.setInputValue('myField', 'Mike');
      });

      expect(formatter).toBeCalled(); // Formatters are executed on each value change
      expect(serializer).not.toBeCalled(); // Serializer are executed *only** when outputting the form data

      formData = formHook.getFormData();
      expect(serializer).toBeCalled();
      expect(formData.name).toEqual('MIKE-serialized');

      // Make sure that when we reset the form values, we don't serialize the fields
      serializer.mockReset();

      await act(async () => {
        formHook!.reset();
      });
      expect(serializer).not.toBeCalled();
    });
  });
});
