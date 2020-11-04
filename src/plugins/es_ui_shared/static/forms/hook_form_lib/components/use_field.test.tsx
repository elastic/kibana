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
import React, { useEffect, FunctionComponent } from 'react';
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

    expect(data.internal).toEqual({
      name: 'John',
      lastName: 'Snow',
    });
  });

  describe('validation', () => {
    let formHook: FormHook | null = null;

    beforeEach(() => {
      formHook = null;
    });

    const onFormHook = (form: FormHook) => {
      formHook = form;
    };

    const getTestComp = (fieldConfig: FieldConfig) => {
      const TestComp = ({ onForm }: { onForm: (form: FormHook) => void }) => {
        const { form } = useForm<any>();

        useEffect(() => {
          onForm(form);
        }, [onForm, form]);

        return (
          <Form form={form}>
            <UseField path="name" config={fieldConfig} data-test-subj="myField" />
          </Form>
        );
      };
      return TestComp;
    };

    const setup = (fieldConfig: FieldConfig) => {
      return registerTestBed(getTestComp(fieldConfig), {
        memoryRouter: { wrapComponent: false },
        defaultProps: { onForm: onFormHook },
      })() as TestBed;
    };

    test('should update the form validity whenever the field value changes', async () => {
      const fieldConfig: FieldConfig = {
        defaultValue: '', // empty string, which is not valid
        validations: [
          {
            validator: ({ value }) => {
              // Validate that string is not empty
              if ((value as string).trim() === '') {
                return { message: 'Error: field is empty.' };
              }
            },
          },
        ],
      };

      // Mount our TestComponent
      const {
        form: { setInputValue },
      } = setup(fieldConfig);

      if (formHook === null) {
        throw new Error('FormHook object has not been set.');
      }

      let { isValid } = formHook;
      expect(isValid).toBeUndefined(); // Initially the form validity is undefined...

      await act(async () => {
        await formHook!.validate(); // ...until we validate the form
      });

      ({ isValid } = formHook);
      expect(isValid).toBe(false);

      // Change to a non empty string to pass validation
      await act(async () => {
        setInputValue('myField', 'changedValue');
      });

      ({ isValid } = formHook);
      expect(isValid).toBe(true);

      // Change back to an empty string to fail validation
      await act(async () => {
        setInputValue('myField', '');
      });

      ({ isValid } = formHook);
      expect(isValid).toBe(false);
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

      const internalFormData = formHook.__getFormData$().value;
      expect(internalFormData.name).toEqual('John-deserialized');

      await act(async () => {
        form.setInputValue('myField', 'Mike');
      });

      expect(formatter).toBeCalled(); // Formatters are executed on each value change
      expect(serializer).not.toBeCalled(); // Serializer are executed *only** when outputting the form data

      const outputtedFormData = formHook.getFormData();
      expect(serializer).toBeCalled();
      expect(outputtedFormData.name).toEqual('MIKE-serialized');

      // Make sure that when we reset the form values, we don't serialize the fields
      serializer.mockReset();

      await act(async () => {
        formHook!.reset();
      });
      expect(serializer).not.toBeCalled();
    });
  });

  describe('custom components', () => {
    interface MyForm {
      name: string;
    }

    let formHook: FormHook<MyForm> | null = null;

    beforeEach(() => {
      formHook = null;
    });

    const onFormHook = (_form: FormHook<MyForm>) => {
      formHook = _form;
    };

    const TestComp = ({
      component,
      onForm,
    }: {
      component: FunctionComponent<any>;
      onForm: (form: FormHook<MyForm>) => void;
    }) => {
      const { form } = useForm<MyForm>();

      useEffect(() => {
        onForm(form);
      }, [onForm, form]);

      return (
        <Form form={form}>
          <UseField path="name" defaultValue="myName" component={component} />
        </Form>
      );
    };

    it('allows function components', () => {
      const Component = () => <textarea data-test-subj="function-component" />;
      const setup = registerTestBed(TestComp, {
        defaultProps: { onForm: onFormHook, component: Component },
        memoryRouter: { wrapComponent: false },
      });
      const testBed = setup() as TestBed;

      expect(testBed.exists('function-component')).toEqual(true);
      expect(formHook?.getFormData()).toEqual({ name: 'myName' });
    });

    it('allows memoized function components', () => {
      const Component = React.memo(() => <textarea data-test-subj="memoized-component" />);
      const setup = registerTestBed(TestComp, {
        defaultProps: { onForm: onFormHook, component: Component },
        memoryRouter: { wrapComponent: false },
      });
      const testBed = setup() as TestBed;

      expect(testBed.exists('memoized-component')).toEqual(true);
      expect(formHook?.getFormData()).toEqual({ name: 'myName' });
    });
  });
});
