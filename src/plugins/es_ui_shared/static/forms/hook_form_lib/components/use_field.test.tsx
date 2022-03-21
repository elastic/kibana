/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, FunctionComponent, useState, useCallback } from 'react';
import { act } from 'react-dom/test-utils';
import { first } from 'rxjs/operators';

import { registerTestBed, TestBed } from '../shared_imports';
import { FormHook, OnUpdateHandler, FieldConfig, FieldHook } from '../types';
import { useForm } from '../hooks/use_form';
import { useBehaviorSubject } from '../hooks/utils/use_behavior_subject';
import { Form } from './form';
import { UseField } from './use_field';

describe('<UseField />', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
    let fieldHook: FieldHook<string> | null = null;

    beforeEach(() => {
      formHook = null;
      fieldHook = null;
    });

    const onFormHook = (form: FormHook) => {
      formHook = form;
    };

    const onFieldHook = (field: FieldHook<string>) => {
      fieldHook = field;
    };

    const getTestComp = (fieldConfig?: FieldConfig<string>) => {
      const TestComp = () => {
        const { form } = useForm();
        const [isFieldActive, setIsFieldActive] = useState(true);
        const [fieldPath, setFieldPath] = useState('name');

        const unmountField = () => {
          setIsFieldActive(false);
        };

        const changeFieldPath = () => {
          setFieldPath('newPath');
        };

        useEffect(() => {
          onFormHook(form);
        }, [form]);

        return (
          <Form form={form}>
            {isFieldActive && (
              <UseField<string> path={fieldPath} config={fieldConfig}>
                {(field) => {
                  onFieldHook(field);

                  return (
                    <input value={field.value} onChange={field.onChange} data-test-subj="myField" />
                  );
                }}
              </UseField>
            )}
            <button onClick={unmountField} data-test-subj="unmountFieldBtn">
              Unmount field
            </button>
            <button onClick={changeFieldPath} data-test-subj="changeFieldPathBtn">
              Change field path
            </button>
          </Form>
        );
      };
      return TestComp;
    };

    const setup = (fieldConfig?: FieldConfig<string>) => {
      return registerTestBed(getTestComp(fieldConfig), {
        memoryRouter: { wrapComponent: false },
      })() as TestBed;
    };

    test('should update the form validity whenever the field value changes', async () => {
      const fieldConfig: FieldConfig<string> = {
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

    test('should not update the state if the field has unmounted while validating', async () => {
      const fieldConfig: FieldConfig<string> = {
        validations: [
          {
            validator: () => {
              // The validation will return its value after 5s
              return new Promise((resolve) => {
                setTimeout(() => {
                  resolve({ message: 'Invalid field' });
                }, 5000);
              });
            },
          },
        ],
      };

      const {
        find,
        form: { setInputValue },
      } = setup(fieldConfig);

      expect(fieldHook?.isValidating).toBe(false);

      // Trigger validation...
      await act(async () => {
        setInputValue('myField', 'changedValue');
      });

      expect(fieldHook?.isValidating).toBe(true);

      // Unmount the field
      await act(async () => {
        find('unmountFieldBtn').simulate('click');
      });

      const originalConsoleError = console.error; // eslint-disable-line no-console
      const spyConsoleError = jest.fn((message) => {
        originalConsoleError(message);
      });
      console.error = spyConsoleError; // eslint-disable-line no-console

      // Move the timer to resolve the validator
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      // The test should not display any warning
      // "Can't perform a React state update on an unmounted component."
      expect(spyConsoleError.mock.calls.length).toBe(0);

      console.error = originalConsoleError; // eslint-disable-line no-console
    });

    test('should not validate the field if the "path" changes but the value has not changed', async () => {
      // This happens with the UseArray. When we delete an item from the array the path for
      // the remaining items are recalculated and thus changed for every <UseField path={...} /> inside
      // the array. We should not re-run the validation when adding/removing array items.

      const validator = jest.fn();
      const fieldConfig: FieldConfig<string> = {
        validations: [
          {
            validator,
          },
        ],
      };

      const {
        find,
        form: { setInputValue },
      } = setup(fieldConfig);

      await act(async () => {
        setInputValue('myField', 'changedValue');
      });

      expect(validator).toHaveBeenCalledTimes(1);
      validator.mockReset();

      await act(async () => {
        // Change the field path
        find('changeFieldPathBtn').simulate('click');
      });

      expect(validator).not.toHaveBeenCalled();
    });

    describe('dynamic data', () => {
      let nameFieldHook: FieldHook<string> | null = null;
      let lastNameFieldHook: FieldHook<string> | null = null;

      const schema = {
        name: {
          validations: [
            {
              validator: async ({ customData: { provider } }) => {
                // Async validator that requires the observable to emit a value
                // to complete the validation. Once it emits a value, the dataProvider
                // Promise fullfills.
                const dynamicData = await provider();
                if (dynamicData === 'bad') {
                  return {
                    message: 'Invalid dynamic data',
                  };
                }
              },
            },
          ],
        } as FieldConfig,
        lastName: {
          validations: [
            {
              validator: ({ customData: { value: validationData } }) => {
                // Sync validator that receives the validationData passed through
                // props on <UseField validationData={...} />
                if (validationData === 'bad') {
                  return {
                    message: `Invalid dynamic data: ${validationData}`,
                  };
                }
              },
            },
          ],
        } as FieldConfig,
      };

      const onNameFieldHook = (field: FieldHook<string>) => {
        nameFieldHook = field;
      };
      const onLastNameFieldHook = (field: FieldHook<string>) => {
        lastNameFieldHook = field;
      };

      interface DynamicValidationDataProps {
        validationData?: unknown;
      }

      const TestComp = ({ validationData }: DynamicValidationDataProps) => {
        const { form } = useForm({ schema });
        const [validationData$, next] = useBehaviorSubject<string | undefined>(undefined);

        const validationDataProvider = useCallback(async () => {
          const data = await validationData$
            .pipe(first((value) => value !== undefined))
            .toPromise();

          // Clear the Observable so we are forced to send a new value to
          // resolve the provider
          next(undefined);
          return data;
        }, [validationData$, next]);

        const setInvalidDynamicData = () => {
          next('bad');
        };

        const setValidDynamicData = () => {
          next('good');
        };

        return (
          <Form form={form}>
            <>
              {/* Dynamic async validation data with an observable. The validation
              will complete **only after** the observable has emitted a value. */}
              <UseField<string> path="name" validationDataProvider={validationDataProvider}>
                {(field) => {
                  onNameFieldHook(field);
                  return (
                    <input
                      data-test-subj="nameField"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  );
                }}
              </UseField>

              {/* Dynamic validation data passed synchronously through props */}
              <UseField<string> path="lastName" validationData={validationData}>
                {(field) => {
                  onLastNameFieldHook(field);
                  return (
                    <input
                      data-test-subj="lastNameField"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  );
                }}
              </UseField>

              <button data-test-subj="setValidValueBtn" onClick={setValidDynamicData}>
                Update dynamic data (valid)
              </button>
              <button data-test-subj="setInvalidValueBtn" onClick={setInvalidDynamicData}>
                Update dynamic data (invalid)
              </button>
            </>
          </Form>
        );
      };

      const setupDynamicData = (defaultProps?: Partial<DynamicValidationDataProps>) => {
        return registerTestBed(TestComp, {
          memoryRouter: { wrapComponent: false },
          defaultProps,
        })() as TestBed;
      };

      beforeEach(() => {
        nameFieldHook = null;
      });

      test('it should access dynamic data provided **after** the field value changed', async () => {
        const { form, find } = setupDynamicData();

        await act(async () => {
          form.setInputValue('nameField', 'newValue');
        });
        // If the field is validating this will prevent the form from being submitted as
        // it will wait for all the fields to finish validating to return the form validity.
        expect(nameFieldHook?.isValidating).toBe(true);

        // Let's wait 10 sec to make sure the validation does not complete
        // until the observable receives a value
        await act(async () => {
          jest.advanceTimersByTime(10000);
        });
        // The field is still validating as the validationDataProvider has not resolved yet
        // (no value has been sent to the observable)
        expect(nameFieldHook?.isValidating).toBe(true);

        // We now send a valid value to the observable
        await act(async () => {
          find('setValidValueBtn').simulate('click');
        });

        expect(nameFieldHook?.isValidating).toBe(false);
        expect(nameFieldHook?.isValid).toBe(true);

        // Let's change the input value to trigger the validation once more
        await act(async () => {
          form.setInputValue('nameField', 'anotherValue');
        });
        expect(nameFieldHook?.isValidating).toBe(true);

        // And send an invalid value to the observable
        await act(async () => {
          find('setInvalidValueBtn').simulate('click');
        });
        expect(nameFieldHook?.isValidating).toBe(false);
        expect(nameFieldHook?.isValid).toBe(false);
        expect(nameFieldHook?.getErrorsMessages()).toBe('Invalid dynamic data');
      });

      test('it should access dynamic data provided through props', async () => {
        let { form } = setupDynamicData({ validationData: 'good' });

        await act(async () => {
          form.setInputValue('lastNameField', 'newValue');
        });
        // As this is a sync validation it should not be validating anymore at this stage
        expect(lastNameFieldHook?.isValidating).toBe(false);
        expect(lastNameFieldHook?.isValid).toBe(true);

        // Now let's provide invalid dynamic data through props
        ({ form } = setupDynamicData({ validationData: 'bad' }));
        await act(async () => {
          form.setInputValue('lastNameField', 'newValue');
        });
        expect(lastNameFieldHook?.isValidating).toBe(false);
        expect(lastNameFieldHook?.isValid).toBe(false);
        expect(lastNameFieldHook?.getErrorsMessages()).toBe('Invalid dynamic data: bad');
      });
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
