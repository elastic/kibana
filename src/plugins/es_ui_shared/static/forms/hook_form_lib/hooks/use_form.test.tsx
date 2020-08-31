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

import { registerTestBed, getRandomString, TestBed } from '../shared_imports';

import { Form, UseField } from '../components';
import { FormSubmitHandler, OnUpdateHandler, FormHook, ValidationFunc } from '../types';
import { useForm } from './use_form';

interface MyForm {
  username: string;
}

interface Props {
  onData: FormSubmitHandler<MyForm>;
}

let formHook: FormHook<any> | null = null;

const onFormHook = (_form: FormHook<any>) => {
  formHook = _form;
};

describe('use_form() hook', () => {
  beforeEach(() => {
    formHook = null;
  });

  describe('form.submit() & config.onSubmit()', () => {
    const onFormData = jest.fn();

    afterEach(() => {
      onFormData.mockReset();
    });

    test('should receive the form data and the validity of the form', async () => {
      const TestComp = ({ onData }: Props) => {
        const { form } = useForm<MyForm>({ onSubmit: onData });

        return (
          <Form form={form}>
            <UseField path="username" data-test-subj="usernameField" />
            <button type="button" onClick={form.submit} />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        defaultProps: { onData: onFormData },
        memoryRouter: { wrapComponent: false },
      });

      const {
        component,
        form: { setInputValue },
      } = setup() as TestBed;

      await act(async () => {
        setInputValue('usernameField', 'John');
        component.find('button').simulate('click');
      });

      const [formData, isValid] = onFormData.mock.calls[onFormData.mock.calls.length - 1];

      expect(formData).toEqual({ username: 'John' });
      expect(isValid).toBe(true);
    });

    test('should build complex data object', async () => {
      const TestComp = ({ onData }: Props) => {
        const { form } = useForm<MyForm>({ onSubmit: onData });

        return (
          <Form form={form}>
            <UseField path="address.country.code" data-test-subj="countryCodeField" />
            <UseField path="address.notes[0]" data-test-subj="addressNote1Field" />
            <UseField path="tags[0]" data-test-subj="tagField1" />
            <UseField path="tags[1]" data-test-subj="tagField2" />

            <button type="button" onClick={form.submit} />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        defaultProps: { onData: onFormData },
        memoryRouter: { wrapComponent: false },
      });

      const {
        component,
        form: { setInputValue },
      } = setup() as TestBed;

      const expectedData = {
        address: {
          country: {
            code: 'BE',
          },
          notes: ['Some description.'],
        },
        tags: ['Belgium', 'Europe'],
      };

      await act(async () => {
        setInputValue('countryCodeField', expectedData.address.country.code);
        setInputValue('addressNote1Field', expectedData.address.notes[0]);
        setInputValue('tagField1', expectedData.tags[0]);
        setInputValue('tagField2', expectedData.tags[1]);

        component.find('button').simulate('click');
      });

      const [formData] = onFormData.mock.calls[onFormData.mock.calls.length - 1];

      expect(formData).toEqual(expectedData);
    });

    test('should not build the object if the form is not valid', async () => {
      const TestComp = ({ onForm }: { onForm: (form: FormHook<MyForm>) => void }) => {
        const { form } = useForm<MyForm>({ defaultValue: { username: 'initialValue' } });
        const validator: ValidationFunc = ({ value }) => {
          if (value === 'wrongValue') {
            return { message: 'Error on the field' };
          }
        };

        useEffect(() => {
          onForm(form);
        }, [onForm, form]);

        return (
          <Form form={form}>
            <UseField
              path="username"
              config={{ validations: [{ validator }] }}
              data-test-subj="myField"
            />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        defaultProps: { onForm: onFormHook },
        memoryRouter: { wrapComponent: false },
      });

      const {
        form: { setInputValue },
      } = setup() as TestBed;

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      let data;
      let isValid;

      await act(async () => {
        ({ data, isValid } = await formHook!.submit());
      });

      expect(isValid).toBe(true);
      expect(data).toEqual({ username: 'initialValue' });

      setInputValue('myField', 'wrongValue'); // Validation will fail

      await act(async () => {
        ({ data, isValid } = await formHook!.submit());
      });

      expect(isValid).toBe(false);
      expect(data).toEqual({}); // Don't build the object (and call the serializers()) when invalid
    });
  });

  describe('form.subscribe()', () => {
    const onFormData = jest.fn();

    afterEach(() => {
      onFormData.mockReset();
    });

    test('should allow subscribing to the form data changes and provide a handler to build the form data', async () => {
      const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
        const { form } = useForm();
        const { subscribe } = form;

        useEffect(() => {
          // Any time the form value changes, forward the data to the consumer
          const subscription = subscribe(onData);
          return subscription.unsubscribe;
        }, [subscribe, onData]);

        return (
          <Form form={form}>
            <UseField path="user.name" data-test-subj="usernameField" />
          </Form>
        );
      };

      const setup = registerTestBed(TestComp, {
        defaultProps: { onData: onFormData },
        memoryRouter: { wrapComponent: false },
      });

      const {
        form: { setInputValue },
      } = setup() as TestBed;

      let [{ data, isValid }] = onFormData.mock.calls[
        onFormData.mock.calls.length - 1
      ] as Parameters<OnUpdateHandler>;

      // Until (1) all fields have been "touched" (in which time their validation is ran)
      // or (2) we call `validate()` on the form, the form validity is "undefined".
      expect(isValid).toBeUndefined();

      // Make some changes to the form fields
      await act(async () => {
        setInputValue('usernameField', 'John');
      });

      [{ data, isValid }] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
        OnUpdateHandler
      >;

      expect(data.raw).toEqual({ 'user.name': 'John' });
      expect(data.format()).toEqual({ user: { name: 'John' } });
      // As we have touched all fields, the validity went from "undefined" to "true"
      expect(isValid).toBe(true);
    });
  });

  describe('config.defaultValue', () => {
    const onFormData = jest.fn();

    afterEach(() => {
      onFormData.mockReset();
    });

    test('should set the default value of a field ', async () => {
      const defaultValue = {
        title: getRandomString(),
        subTitle: getRandomString(),
        user: { name: getRandomString() },
        // "unknown" is not declared in the form so it should be stripped
        unknown: 'Should be stripped',
      };

      const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
        const { form } = useForm({ defaultValue });
        const { subscribe } = form;

        useEffect(() => subscribe(onData).unsubscribe, [subscribe, onData]);

        return (
          <Form form={form}>
            <UseField path="user.name" />
            <UseField path="title" />
            <UseField path="subTitle" defaultValue="hasBeenOverridden" />
          </Form>
        );
      };

      registerTestBed(TestComp, {
        defaultProps: { onData: onFormData },
        memoryRouter: { wrapComponent: false },
      })();

      expect(onFormData.mock.calls.length).toBe(1);

      const [{ data }] = onFormData.mock.calls[onFormData.mock.calls.length - 1] as Parameters<
        OnUpdateHandler
      >;

      expect(data.raw).toEqual({
        title: defaultValue.title,
        subTitle: 'hasBeenOverridden',
        'user.name': defaultValue.user.name,
      });
    });
  });

  describe('form.reset()', () => {
    const defaultValue = {
      username: 'defaultValue',
      deeply: { nested: { value: 'defaultValue' } },
    };

    type RestFormTest = typeof defaultValue;

    const TestComp = ({ onForm }: { onForm: (form: FormHook<any>) => void }) => {
      const { form } = useForm<RestFormTest>({
        defaultValue,
        options: { stripEmptyFields: false },
      });

      useEffect(() => {
        onForm(form);
      }, [onForm, form]);

      return (
        <Form form={form}>
          <UseField
            path="username"
            config={{ defaultValue: 'configDefaultValue' }}
            data-test-subj="userNameField"
          />
          <UseField
            path="city"
            config={{ defaultValue: 'configDefaultValue' }}
            defaultValue="inlineDefaultValue"
            data-test-subj="cityField"
          />
          <UseField path="deeply.nested.value" data-test-subj="deeplyNestedField" />
        </Form>
      );
    };

    const setup = registerTestBed(TestComp, {
      defaultProps: { onForm: onFormHook },
      memoryRouter: { wrapComponent: false },
    });

    test('should put back the defaultValue for each field', async () => {
      const {
        form: { setInputValue },
      } = setup() as TestBed;

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      let formData: Partial<RestFormTest> = {};

      await act(async () => {
        formData = formHook!.getFormData();
      });
      expect(formData).toEqual({
        username: 'defaultValue',
        city: 'inlineDefaultValue',
        deeply: { nested: { value: 'defaultValue' } },
      });

      setInputValue('userNameField', 'changedValue');
      setInputValue('cityField', 'changedValue');
      setInputValue('deeplyNestedField', 'changedValue');

      await act(async () => {
        formData = formHook!.getFormData();
      });
      expect(formData).toEqual({
        username: 'changedValue',
        city: 'changedValue',
        deeply: { nested: { value: 'changedValue' } },
      });

      await act(async () => {
        formHook!.reset();
      });

      await act(async () => {
        formData = formHook!.getFormData();
      });
      expect(formData).toEqual({
        username: 'defaultValue',
        city: 'inlineDefaultValue', // Inline default value is correctly kept after resetting
        deeply: { nested: { value: 'defaultValue' } },
      });
    });

    test('should allow to pass a new "defaultValue" object for the fields', async () => {
      const {
        form: { setInputValue },
      } = setup() as TestBed;

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      setInputValue('userNameField', 'changedValue');
      setInputValue('cityField', 'changedValue');
      setInputValue('deeplyNestedField', 'changedValue');

      let formData: Partial<RestFormTest> = {};

      await act(async () => {
        formHook!.reset({
          defaultValue: {
            city: () => 'newDefaultValue', // A function can also be passed
            deeply: { nested: { value: 'newDefaultValue' } },
          },
        });
      });
      await act(async () => {
        formData = formHook!.getFormData();
      });
      expect(formData).toEqual({
        username: 'configDefaultValue', // Back to the config defaultValue as no value was provided when resetting
        city: 'newDefaultValue',
        deeply: { nested: { value: 'newDefaultValue' } },
      });

      // Make sure all field are back to the config defautlValue, even when we have a UseField with inline prop "defaultValue"
      await act(async () => {
        formHook!.reset({
          defaultValue: {},
        });
      });
      await act(async () => {
        formData = formHook!.getFormData();
      });
      expect(formData).toEqual({
        username: 'configDefaultValue',
        city: 'configDefaultValue', // Inline default value **is not** kept after resetting with undefined "city" value
        deeply: { nested: { value: '' } }, // Fallback to empty string as no config was provided
      });
    });
  });
});
