/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, FunctionComponent } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, TestBed } from '../shared_imports';
import { FormHook, OnUpdateHandler, FieldConfig, FieldHook } from '../types';
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

    const [{ data }] = onFormData.mock.calls[
      onFormData.mock.calls.length - 1
    ] as Parameters<OnUpdateHandler>;

    expect(data.internal).toEqual({
      name: 'John',
      lastName: 'Snow',
    });
  });

  describe('state', () => {
    describe('isPristine, isDirty, isModified', () => {
      // Dummy component to handle object type data
      const ObjectField: React.FC<{ field: FieldHook }> = ({ field: { setValue } }) => {
        const onFieldChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          // Make sure to set the field value to an **object**
          setValue(JSON.parse(e.target.value));
        };

        return <input onChange={onFieldChange} data-test-subj="testField" />;
      };

      interface FieldState {
        isModified: boolean;
        isDirty: boolean;
        isPristine: boolean;
        value: unknown;
      }

      const getChildrenFunc = (
        onStateChange: (state: FieldState) => void,
        Component?: React.ComponentType<{ field: FieldHook }>
      ) => {
        // This is the children passed down to the <UseField path="name" /> of our form
        const childrenFunc = (field: FieldHook) => {
          const { onChange, isModified, isPristine, isDirty, value } = field;

          // Forward the field state to our jest.fn() spy
          onStateChange({ isModified, isPristine, isDirty, value });

          // Render the child component if any (useful to test the Object field type)
          return Component ? (
            <Component field={field} />
          ) : (
            <input onChange={onChange} data-test-subj="testField" />
          );
        };

        return childrenFunc;
      };

      interface Props {
        fieldProps: Record<string, any>;
      }

      const TestComp = ({ fieldProps }: Props) => {
        const { form } = useForm();
        return (
          <Form form={form}>
            <UseField path="name" {...fieldProps} />
          </Form>
        );
      };

      const onStateChangeSpy = jest.fn<void, [FieldState]>();
      const lastFieldState = (): FieldState =>
        onStateChangeSpy.mock.calls[onStateChangeSpy.mock.calls.length - 1][0];
      const toString = (value: unknown): string =>
        typeof value === 'string' ? value : JSON.stringify(value);

      const setup = registerTestBed(TestComp, {
        defaultProps: { onStateChangeSpy },
        memoryRouter: { wrapComponent: false },
      });

      [
        {
          description: 'should update the state for field without default values',
          initialValue: '',
          changedValue: 'changed',
          fieldProps: { children: getChildrenFunc(onStateChangeSpy) },
        },
        {
          description: 'should update the state for field with default value in their config',
          initialValue: 'initialValue',
          changedValue: 'changed',
          fieldProps: {
            children: getChildrenFunc(onStateChangeSpy),
            config: { defaultValue: 'initialValue' },
          },
        },
        {
          description: 'should update the state for field with default value passed through props',
          initialValue: 'initialValue',
          changedValue: 'changed',
          fieldProps: {
            children: getChildrenFunc(onStateChangeSpy),
            defaultValue: 'initialValue',
          },
        },
        // "Object" field type must be JSON.serialized to compare old and new value
        // this test makes sure this is done and "isModified" is indeed "false" when
        // putting back the original object
        {
          description: 'should update the state for field with object field type',
          initialValue: { initial: 'value' },
          changedValue: { foo: 'bar' },
          fieldProps: {
            children: getChildrenFunc(onStateChangeSpy, ObjectField),
            defaultValue: { initial: 'value' },
          },
        },
      ].forEach(({ description, fieldProps, initialValue, changedValue }) => {
        test(description, async () => {
          const { form } = await setup({ fieldProps });

          expect(lastFieldState()).toEqual({
            isPristine: true,
            isDirty: false,
            isModified: false,
            value: initialValue,
          });

          await act(async () => {
            form.setInputValue('testField', toString(changedValue));
          });

          expect(lastFieldState()).toEqual({
            isPristine: false,
            isDirty: true,
            isModified: true,
            value: changedValue,
          });

          // Put back to the initial value --> isModified should be false
          await act(async () => {
            form.setInputValue('testField', toString(initialValue));
          });
          expect(lastFieldState()).toEqual({
            isPristine: false,
            isDirty: true,
            isModified: false,
            value: initialValue,
          });
        });
      });
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

  describe('change handlers', () => {
    const onError = jest.fn();

    beforeEach(() => {
      jest.resetAllMocks();
    });

    const getTestComp = (fieldConfig: FieldConfig) => {
      const TestComp = () => {
        const { form } = useForm<any>();

        return (
          <Form form={form}>
            <UseField path="name" config={fieldConfig} data-test-subj="myField" onError={onError} />
          </Form>
        );
      };
      return TestComp;
    };

    const setup = (fieldConfig: FieldConfig) => {
      return registerTestBed(getTestComp(fieldConfig), {
        memoryRouter: { wrapComponent: false },
      })() as TestBed;
    };

    it('calls onError when validation state changes', async () => {
      const {
        form: { setInputValue },
      } = setup({
        validations: [
          {
            validator: ({ value }) => (value === '1' ? undefined : { message: 'oops!' }),
          },
        ],
      });

      expect(onError).toBeCalledTimes(0);
      await act(async () => {
        setInputValue('myField', '0');
      });
      expect(onError).toBeCalledTimes(1);
      expect(onError).toBeCalledWith(['oops!']);
      await act(async () => {
        setInputValue('myField', '1');
      });
      expect(onError).toBeCalledTimes(2);
      expect(onError).toBeCalledWith(null);
    });
  });
});
