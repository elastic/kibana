/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getRandomString } from '../shared_imports';
import { emptyField } from '../../helpers/field_validators';
import { ComboBoxField } from '../../components';
import { Form, UseField, UseArray } from '../components';
import type {
  FormSubmitHandler,
  OnUpdateHandler,
  FormHook,
  FieldHook,
  ValidationFunc,
  FieldConfig,
} from '..';
import { VALIDATION_TYPES } from '..';
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

beforeAll(() => {
  jest.useFakeTimers();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(() => {
  jest.clearAllMocks();
  formHook = null;
});

const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

describe('useForm() hook', () => {
  const onFormData = jest.fn();

  describe('form.submit() & config.onSubmit()', () => {
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

      render(<TestComp onData={onFormData} />);

      const usernameField = screen.getByTestId('usernameField');
      await user.clear(usernameField);
      await user.type(usernameField, 'John');

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onFormData).toHaveBeenCalled();

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

      render(<TestComp onData={onFormData} />);

      const expectedData = {
        address: {
          country: {
            code: 'BE',
          },
          notes: ['Some description.'],
        },
        tags: ['Belgium', 'Europe'],
      };

      const countryCodeField = screen.getByTestId('countryCodeField');
      const addressNote1Field = screen.getByTestId('addressNote1Field');
      const tagField1 = screen.getByTestId('tagField1');
      const tagField2 = screen.getByTestId('tagField2');

      await user.type(countryCodeField, expectedData.address.country.code);
      await user.type(addressNote1Field, expectedData.address.notes[0]);
      await user.type(tagField1, expectedData.tags[0]);
      await user.type(tagField2, expectedData.tags[1]);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(onFormData).toHaveBeenCalled();

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

      render(<TestComp onForm={onFormHook} />);

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      let data;
      let isValid;

      await act(async () => {
        const submitPromise = formHook!.submit();
        await jest.runAllTimersAsync();
        ({ data, isValid } = await submitPromise);
      });

      expect(isValid).toBe(true);
      expect(data).toEqual({ username: 'initialValue' });

      const myField = screen.getByTestId('myField');
      await user.clear(myField);
      await user.type(myField, 'wrongValue'); // Validation will fail

      await act(async () => {
        const submitPromise = formHook!.submit();
        await jest.runAllTimersAsync();
        ({ data, isValid } = await submitPromise);
      });

      expect(isValid).toBe(false);
      // If the form is not valid, we don't build the final object to avoid
      // calling the serializer(s) with invalid values.
      expect(data).toEqual({});
    });
  });

  describe('form.subscribe()', () => {
    test('should allow subscribing to the form data changes and provide a handler to build the form data', async () => {
      const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
        const { form } = useForm({
          serializer: (value) => ({
            user: {
              name: value.user.name.toUpperCase(),
            },
          }),
        });
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

      render(<TestComp onData={onFormData} />);

      let [{ data, isValid }] = onFormData.mock.calls[
        onFormData.mock.calls.length - 1
      ] as Parameters<OnUpdateHandler>;

      // Until (1) all fields have been "touched" (in which time their validation is ran)
      // or (2) we call `validate()` on the form, the form validity is "undefined".
      expect(isValid).toBeUndefined();

      // Make some changes to the form fields
      const usernameField = screen.getByTestId('usernameField');
      await user.clear(usernameField);
      await user.type(usernameField, 'John');

      [{ data, isValid }] = onFormData.mock.calls[
        onFormData.mock.calls.length - 1
      ] as Parameters<OnUpdateHandler>;

      expect(data.internal).toEqual({ user: { name: 'John' } });
      // Transform name to uppercase as decalred in our serializer func
      expect(data.format()).toEqual({ user: { name: 'JOHN' } });
      // As we have touched all fields, the validity went from "undefined" to "true"
      expect(isValid).toBe(true);
    });
  });

  describe('config.defaultValue', () => {
    test('should set the default value of a field ', () => {
      const defaultValue = {
        title: getRandomString(),
        subTitle: getRandomString(),
        user: { name: getRandomString() },
        // "unknown" is not declared in the form so it should be stripped
        unknown: 'Should be stripped',
      };

      const TestComp = ({ onData }: { onData: OnUpdateHandler }) => {
        const { form } = useForm({ defaultValue });
        formHook = form;
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

      render(<TestComp onData={onFormData} />);

      expect(onFormData.mock.calls.length).toBe(1);

      const [{ data }] = onFormData.mock.calls[
        onFormData.mock.calls.length - 1
      ] as Parameters<OnUpdateHandler>;

      expect(data.internal).toEqual({
        title: defaultValue.title,
        subTitle: 'hasBeenOverridden',
        user: {
          name: defaultValue.user.name,
        },
      });

      expect(formHook?.__getFormDefaultValue()).toEqual({
        ...defaultValue,
        subTitle: 'hasBeenOverridden',
      });
    });

    test('should be updated with the UseField "defaultValue" prop', async () => {
      const TestComp = () => {
        const { form } = useForm({ defaultValue: { name: 'Mike' } });
        const [_, setDate] = useState(new Date());
        formHook = form;

        return (
          <Form form={form}>
            {/* "John" should be set in the form defaultValue */}
            <UseField path="name" defaultValue="John" />
            <button data-test-subj="forceUpdateBtn" onClick={() => setDate(new Date())}>
              Force udpate
            </button>
          </Form>
        );
      };

      render(<TestComp />);

      expect(formHook?.__getFormDefaultValue()).toEqual({ name: 'John' });

      // Make sure a re-render of the component does not re-update the defaultValue
      const forceUpdateBtn = screen.getByTestId('forceUpdateBtn');
      await user.click(forceUpdateBtn);

      expect(formHook?.__getFormDefaultValue()).toEqual({ name: 'John' });
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

    test('should put back the defaultValue for each field', async () => {
      render(<TestComp onForm={onFormHook} />);

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      let formData: Partial<RestFormTest> = {};

      formData = formHook!.getFormData();
      expect(formData).toEqual({
        username: 'defaultValue',
        city: 'inlineDefaultValue',
        deeply: { nested: { value: 'defaultValue' } },
      });

      const userNameField = screen.getByTestId('userNameField');
      const cityField = screen.getByTestId('cityField');
      const deeplyNestedField = screen.getByTestId('deeplyNestedField');

      await user.clear(userNameField);
      await user.type(userNameField, 'changedValue');
      await user.clear(cityField);
      await user.type(cityField, 'changedValue');
      await user.clear(deeplyNestedField);
      await user.type(deeplyNestedField, 'changedValue');

      formData = formHook!.getFormData();
      expect(formData).toEqual({
        username: 'changedValue',
        city: 'changedValue',
        deeply: { nested: { value: 'changedValue' } },
      });

      act(() => {
        formHook!.reset();
      });

      formData = formHook!.getFormData();
      expect(formData).toEqual({
        username: 'defaultValue',
        city: 'inlineDefaultValue', // Inline default value is correctly kept after resetting
        deeply: { nested: { value: 'defaultValue' } },
      });
    });

    test('should allow to pass a new "defaultValue" object for the fields', async () => {
      render(<TestComp onForm={onFormHook} />);

      if (!formHook) {
        throw new Error(
          `formHook is not defined. Use the onForm() prop to update the reference to the form hook.`
        );
      }

      const userNameField = screen.getByTestId('userNameField');
      const cityField = screen.getByTestId('cityField');
      const deeplyNestedField = screen.getByTestId('deeplyNestedField');

      await user.clear(userNameField);
      await user.type(userNameField, 'changedValue');
      await user.clear(cityField);
      await user.type(cityField, 'changedValue');
      await user.clear(deeplyNestedField);
      await user.type(deeplyNestedField, 'changedValue');

      let formData: Partial<RestFormTest> = {};

      act(() => {
        formHook!.reset({
          defaultValue: {
            city: () => 'newDefaultValue', // A function can also be passed
            deeply: { nested: { value: 'newDefaultValue' } },
          },
        });
      });
      formData = formHook!.getFormData();
      expect(formData).toEqual({
        username: 'configDefaultValue', // Back to the config defaultValue as no value was provided when resetting
        city: 'newDefaultValue',
        deeply: { nested: { value: 'newDefaultValue' } },
      });

      // Make sure all field are back to the config defautlValue, even when we have a UseField with inline prop "defaultValue"
      act(() => {
        formHook!.reset({
          defaultValue: {},
        });
      });
      formData = formHook!.getFormData();
      expect(formData).toEqual({
        username: 'configDefaultValue',
        city: 'configDefaultValue', // Inline default value **is not** kept after resetting with undefined "city" value
        deeply: { nested: { value: '' } }, // Fallback to empty string as no config was provided
      });
    });

    test('should not validate the fields after resetting its value (form validity should be undefined)', async () => {
      const fieldConfig: FieldConfig = {
        defaultValue: '',
        validations: [
          {
            validator: ({ value }) => {
              if ((value as string).trim() === '') {
                return { message: 'Error: empty string' };
              }
            },
          },
        ],
      };

      const TestResetComp = () => {
        const { form } = useForm();

        useEffect(() => {
          formHook = form;
        }, [form]);

        return (
          <Form form={form}>
            <UseField path="username" config={fieldConfig} data-test-subj="myField" />
          </Form>
        );
      };

      render(<TestResetComp />);

      let { isValid } = formHook!;
      expect(isValid).toBeUndefined();

      const myField = screen.getByTestId('myField');
      await user.clear(myField);
      await user.type(myField, 'changedValue');
      myField.blur();

      ({ isValid } = formHook!);
      expect(isValid).toBe(true);

      // When we reset the form, value is back to "", which is invalid for the field
      act(() => {
        formHook!.reset();
      });

      ({ isValid } = formHook!);
      expect(isValid).toBeUndefined(); // Make sure it is "undefined" and not "false".
    });
  });

  describe('form.validate()', () => {
    test('should not invalidate a field with arrayItem validation when validating a form', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField
              path="test-path"
              config={{
                validations: [
                  {
                    validator: emptyField('error-message'),
                    type: VALIDATION_TYPES.ARRAY_ITEM,
                    isBlocking: false,
                  },
                ],
              }}
            />
          </Form>
        );
      };

      render(<TestComp />);

      let isValid: boolean = false;

      await act(async () => {
        const validatePromise = formHook!.validate();
        await jest.runAllTimersAsync();
        isValid = await validatePromise;
      });

      expect(isValid).toBe(true);
    });

    test('should invalidate a field with a blocking arrayItem validation when validating a form', async () => {
      let fieldHook: FieldHook;

      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField
              path="test-path"
              config={{
                validations: [
                  {
                    validator: emptyField('error-message'),
                    type: VALIDATION_TYPES.ARRAY_ITEM,
                    isBlocking: true,
                  },
                ],
              }}
            >
              {(field) => {
                fieldHook = field;
                return null;
              }}
            </UseField>
          </Form>
        );
      };

      render(<TestComp />);

      let isValid: boolean = false;

      // We need to call the field validation to mark this field as invalid.
      // This will then mark the form as invalid when calling formHook.validate() below
      await act(async () => {
        const validatePromise = fieldHook.validate({ validationType: VALIDATION_TYPES.ARRAY_ITEM });
        await jest.runAllTimersAsync();
        await validatePromise;
      });

      await act(async () => {
        const validatePromise = formHook!.validate();
        await jest.runAllTimersAsync();
        isValid = await validatePromise;
      });

      expect(isValid).toBe(false);
    });

    test('should return correct state when validating a form field (combo box)', async () => {
      let fieldHook: FieldHook<string[], unknown>;

      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField
              path="test-path"
              defaultValue={['foo']}
              config={{
                validations: [
                  {
                    validator: emptyField('error-message'),
                  },
                ],
              }}
            >
              {(field) => {
                fieldHook = field;
                return <ComboBoxField field={field as FieldHook} />;
              }}
            </UseField>
          </Form>
        );
      };

      render(<TestComp />);

      let isValid: boolean = false;

      act(() => {
        fieldHook.setValue([]);
      });

      await act(async () => {
        const validatePromise = formHook!.validate();
        await jest.runAllTimersAsync();
        isValid = await validatePromise;
      });

      expect(isValid).toBe(false);

      act(() => {
        fieldHook.setValue(['bar']);
      });

      await act(async () => {
        const validatePromise = formHook!.validate();
        await jest.runAllTimersAsync();
        isValid = await validatePromise;
      });

      expect(isValid).toBe(true);
    });
  });

  describe('form.getErrors()', () => {
    test('should return the errors in the form', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField
              path="field1"
              config={{
                validations: [
                  {
                    validator: emptyField('Field1 can not be empty'),
                  },
                ],
              }}
            />

            <UseField
              path="field2"
              data-test-subj="field2"
              config={{
                validations: [
                  {
                    validator: ({ value }) => {
                      if (value === 'bad') {
                        return {
                          message: 'Field2 is invalid',
                        };
                      }
                    },
                  },
                ],
              }}
            />
          </Form>
        );
      };

      render(<TestComp />);

      let errors: string[] = formHook!.getErrors();
      expect(errors).toEqual([]);

      await act(async () => {
        const submitPromise = formHook!.submit();
        await jest.runAllTimersAsync();
        await submitPromise;
      });

      errors = formHook!.getErrors();
      expect(errors).toEqual(['Field1 can not be empty']);

      const field2 = screen.getByTestId('field2');
      await user.type(field2, 'bad');
      field2.blur();

      errors = formHook!.getErrors();
      expect(errors).toEqual(['Field1 can not be empty', 'Field2 is invalid']);
    });
  });

  describe('form.updateFieldValues()', () => {
    test('should update field values and discard unknwon fields provided', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField path="field1" config={{ defaultValue: 'field1_defaultValue' }} />
            <UseField path="field2.a" config={{ defaultValue: 'field2_a_defaultValue' }} />
            <UseField path="field2.b" config={{ defaultValue: 'field2_b_defaultValue' }} />
          </Form>
        );
      };

      render(<TestComp />);

      expect(formHook!.getFormData()).toEqual({
        field1: 'field1_defaultValue',
        field2: {
          a: 'field2_a_defaultValue',
          b: 'field2_b_defaultValue',
        },
      });

      act(() => {
        formHook!.updateFieldValues({
          field1: 'field1_updated',
          field2: {
            a: 'field2_a_updated',
            b: 'field2_b_updated',
          },
          unknownField: 'foo',
        });
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(formHook!.getFormData()).toEqual({
        field1: 'field1_updated',
        field2: {
          a: 'field2_a_updated',
          b: 'field2_b_updated',
        },
      });
    });

    test('should update an array of object fields', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseArray path="users">
              {({ items }) => (
                <>
                  {items.map(({ id, path, isNew }) => (
                    <div key={id}>
                      <UseField
                        path={`${path}.name`}
                        config={{ defaultValue: 'John' }}
                        readDefaultValueOnForm={!isNew}
                      />
                      <UseField
                        path={`${path}.lastName`}
                        config={{ defaultValue: 'Snow' }}
                        readDefaultValueOnForm={!isNew}
                      />
                    </div>
                  ))}
                </>
              )}
            </UseArray>
          </Form>
        );
      };

      render(<TestComp />);

      expect(formHook!.getFormData()).toEqual({
        users: [
          {
            name: 'John',
            lastName: 'Snow',
          },
        ],
      });

      const newFormData = {
        users: [
          {
            name: 'User1_name',
            lastName: 'User1_lastName',
          },
          {
            name: 'User2_name',
            lastName: 'User2_lastName',
          },
        ],
      };

      act(() => {
        formHook!.updateFieldValues(newFormData);
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(formHook!.getFormData()).toEqual(newFormData);
    });

    test('should update an array of string fields (ComboBox)', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseField path="tags" defaultValue={['foo', 'bar']} component={ComboBoxField} />
          </Form>
        );
      };

      render(<TestComp />);

      expect(formHook!.getFormData()).toEqual({
        tags: ['foo', 'bar'],
      });

      const newFormData = {
        tags: ['updated', 'array'],
      };

      act(() => {
        formHook!.updateFieldValues(newFormData);
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(formHook!.getFormData()).toEqual(newFormData);
    });

    test('should update recursively an array of object fields', async () => {
      const TestComp = () => {
        const { form } = useForm();
        formHook = form;

        return (
          <Form form={form}>
            <UseArray path="users">
              {({ items: userItems }) => (
                <>
                  {userItems.map(({ id: userId, path: userPath }) => (
                    <div key={userId}>
                      <UseField path={`${userPath}.name`} config={{ defaultValue: 'John' }} />
                      <UseArray path={`${userPath}.address`}>
                        {({ items: addressItems }) => (
                          <>
                            {addressItems.map(
                              ({ id: addressId, path: addressPath, isNew: isNewAddress }) => (
                                <div key={addressId}>
                                  <UseField
                                    path={`${addressPath}.street`}
                                    config={{ defaultValue: 'Street name' }}
                                    readDefaultValueOnForm={!isNewAddress}
                                  />
                                  <UseField
                                    path={`${addressPath}.city`}
                                    config={{ defaultValue: 'Lagos' }}
                                    readDefaultValueOnForm={!isNewAddress}
                                  />
                                </div>
                              )
                            )}
                          </>
                        )}
                      </UseArray>
                      <UseField
                        path={`${userPath}.tags`}
                        config={{ defaultValue: ['blue', 'red'] }}
                        component={ComboBoxField}
                      />
                    </div>
                  ))}
                </>
              )}
            </UseArray>
          </Form>
        );
      };

      render(<TestComp />);

      expect(formHook!.getFormData()).toEqual({
        users: [
          {
            name: 'John',
            address: [
              {
                street: 'Street name',
                city: 'Lagos',
              },
            ],
            tags: ['blue', 'red'],
          },
        ],
      });

      const newFormData = {
        users: [
          {
            name: 'Balbina',
            tags: ['yellow', 'pink'],
            address: [
              {
                street: 'Rua direita',
                city: 'Burgau',
              },
            ],
          },
          {
            name: 'Mike',
            tags: ['green', 'black', 'orange'],
            address: [
              {
                street: 'Calle de Callao',
                city: 'Madrid',
              },
              {
                street: 'Rue de Flagey',
                city: 'Brussels',
              },
            ],
          },
        ],
      };

      act(() => {
        formHook!.updateFieldValues(newFormData);
      });

      await act(async () => {
        await jest.runAllTimersAsync();
      });

      expect(formHook!.getFormData()).toEqual(newFormData);
    });

    describe('deserializer', () => {
      const formDefaultValue = { foo: 'initial' };
      const deserializer = (formData: typeof formDefaultValue) => ({
        foo: { label: formData.foo.toUpperCase(), value: formData.foo },
      });

      const TestComp = () => {
        const { form } = useForm({ defaultValue: formDefaultValue, deserializer });
        formHook = form;

        return (
          <Form form={form}>
            <UseField path="foo">{() => null}</UseField>
          </Form>
        );
      };

      test('should run deserializer on the new form data provided', async () => {
        render(<TestComp />);

        expect(formHook!.getFormData()).toEqual({
          foo: { label: 'INITIAL', value: 'initial' },
        });

        const newFormData = {
          foo: 'updated',
        };

        act(() => {
          formHook!.updateFieldValues(newFormData);
        });

        await act(async () => {
          await jest.runAllTimersAsync();
        });

        expect(formHook!.getFormData()).toEqual({
          foo: { label: 'UPDATED', value: 'updated' },
        });
      });

      test('should not run deserializer on the new form data provided', async () => {
        render(<TestComp />);

        expect(formHook!.getFormData()).toEqual({
          foo: { label: 'INITIAL', value: 'initial' },
        });

        const newFormData = {
          foo: 'updated',
        };

        act(() => {
          formHook!.updateFieldValues(newFormData, { runDeserializer: false });
        });

        await act(async () => {
          await jest.runAllTimersAsync();
        });

        expect(formHook!.getFormData()).toEqual({
          foo: 'updated',
        });
      });
    });
  });
});
