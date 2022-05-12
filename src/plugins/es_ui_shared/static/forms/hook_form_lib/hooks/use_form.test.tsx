/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { act } from 'react-dom/test-utils';

import { registerTestBed, getRandomString, TestBed } from '../shared_imports';
import { emptyField } from '../../helpers/field_validators';
import { ComboBoxField } from '../../components';
import { Form, UseField, UseArray } from '../components';
import {
  FormSubmitHandler,
  OnUpdateHandler,
  FormHook,
  FieldHook,
  ValidationFunc,
  FieldConfig,
  VALIDATION_TYPES,
} from '..';
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

describe('useForm() hook', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

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
      // If the form is not valid, we don't build the final object to avoid
      // calling the serializer(s) with invalid values.
      expect(data).toEqual({});
    });
  });

  describe('form.subscribe()', () => {
    const onFormData = jest.fn();

    afterEach(() => {
      onFormData.mockReset();
    });

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
    const onFormData = jest.fn();

    afterEach(() => {
      onFormData.mockReset();
    });

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

      registerTestBed(TestComp, {
        defaultProps: { onData: onFormData },
        memoryRouter: { wrapComponent: false },
      })();

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

    test('should be updated with the UseField "defaultValue" prop', () => {
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

      const { find } = registerTestBed(TestComp, { memoryRouter: { wrapComponent: false } })();

      expect(formHook?.__getFormDefaultValue()).toEqual({ name: 'John' });

      // Make sure a re-render of the component does not re-update the defaultValue
      act(() => {
        find('forceUpdateBtn').simulate('click');
      });

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

      const {
        form: { setInputValue },
      } = registerTestBed(TestResetComp, {
        memoryRouter: { wrapComponent: false },
      })() as TestBed;

      let { isValid } = formHook!;
      expect(isValid).toBeUndefined();

      await act(async () => {
        setInputValue('myField', 'changedValue');
      });
      ({ isValid } = formHook!);
      expect(isValid).toBe(true);

      await act(async () => {
        // When we reset the form, value is back to "", which is invalid for the field
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

      registerTestBed(TestComp)();

      let isValid: boolean = false;

      await act(async () => {
        isValid = await formHook!.validate();
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

      registerTestBed(TestComp)();

      let isValid: boolean = false;

      act(() => {
        // We need to call the field validation to mark this field as invalid.
        // This will then mark the form as invalid when calling formHook.validate() below
        fieldHook.validate({ validationType: VALIDATION_TYPES.ARRAY_ITEM });
      });

      await act(async () => {
        isValid = await formHook!.validate();
      });

      expect(isValid).toBe(false);
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

      const {
        form: { setInputValue },
      } = registerTestBed(TestComp)() as TestBed;

      let errors: string[] = formHook!.getErrors();
      expect(errors).toEqual([]);

      await act(async () => {
        await formHook!.submit();
      });
      errors = formHook!.getErrors();
      expect(errors).toEqual(['Field1 can not be empty']);

      await setInputValue('field2', 'bad');
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

      registerTestBed(TestComp)();

      expect(formHook!.getFormData()).toEqual({
        field1: 'field1_defaultValue',
        field2: {
          a: 'field2_a_defaultValue',
          b: 'field2_b_defaultValue',
        },
      });

      await act(async () => {
        formHook!.updateFieldValues({
          field1: 'field1_updated',
          field2: {
            a: 'field2_a_updated',
            b: 'field2_b_updated',
          },
          unknownField: 'foo',
        });
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

      registerTestBed(TestComp)();

      if (formHook === null) {
        throw new Error('Formhook has not been set.');
      }

      expect(formHook.getFormData()).toEqual({
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

      await act(async () => {
        formHook!.updateFieldValues(newFormData);
      });

      expect(formHook.getFormData()).toEqual(newFormData);
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

      registerTestBed(TestComp)();

      if (formHook === null) {
        throw new Error('Formhook has not been set.');
      }

      expect(formHook.getFormData()).toEqual({
        tags: ['foo', 'bar'],
      });

      const newFormData = {
        tags: ['updated', 'array'],
      };

      await act(async () => {
        formHook!.updateFieldValues(newFormData);
      });

      expect(formHook.getFormData()).toEqual(newFormData);
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

      registerTestBed(TestComp)();

      if (formHook === null) {
        throw new Error('Formhook has not been set.');
      }

      expect(formHook.getFormData()).toEqual({
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

      await act(async () => {
        formHook!.updateFieldValues(newFormData);
      });

      expect(formHook.getFormData()).toEqual(newFormData);
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
        registerTestBed(TestComp)();

        if (formHook === null) {
          throw new Error('Formhook has not been set.');
        }

        expect(formHook.getFormData()).toEqual({
          foo: { label: 'INITIAL', value: 'initial' },
        });

        const newFormData = {
          foo: 'updated',
        };

        await act(async () => {
          formHook!.updateFieldValues(newFormData);
        });

        expect(formHook.getFormData()).toEqual({
          foo: { label: 'UPDATED', value: 'updated' },
        });
      });

      test('should not run deserializer on the new form data provided', async () => {
        registerTestBed(TestComp)();

        if (formHook === null) {
          throw new Error('Formhook has not been set.');
        }

        expect(formHook.getFormData()).toEqual({
          foo: { label: 'INITIAL', value: 'initial' },
        });

        const newFormData = {
          foo: 'updated',
        };

        await act(async () => {
          formHook!.updateFieldValues(newFormData, { runDeserializer: false });
        });

        expect(formHook.getFormData()).toEqual({
          foo: 'updated',
        });
      });
    });
  });
});
