---
id: validation
title: Validation
sidebar_label: Validation
---

## Basic

```js
import React from 'react';
import {
  useForm,
  Form,
  UseField,
  FieldConfig,
} from '<path-to-form-lib>';

interface MyForm {
  name: string;
}

const nameConfig: FieldConfig<MyForm, string> = {
  validations: [
    {
      validator: ({ value }) => {
        if (value.trim() === '') {
          return {
            message: 'The name cannot be empty.',
          };
        }
      },
    },
    // ...
    // You can add as many validations as you need.
    // It is better to kepp validators single purposed.
  ],
};

export const ValidationBasic = () => {
  const { form } = useForm<MyForm>();

  return (
    <Form form={form}>
      <UseField path="name" config={nameConfig}>
        {(field) => {
          const isInvalid = !field.isChangingValue && field.errors.length > 0;
          return (
            <>
              <EuiFieldText
                isInvalid={isInvalid}
                value={field.value}
                onChange={field.onChange}
                fullWidth
              />
              {!field.isValid && <div>{field.getErrorsMessages()}</div>}
            </>
          );
        }}
      </UseField>
    </Form>
  );
};
```

## Reusable validators

Before creating your own validator, verify that it does not exist already in our reusable field validators.

In the example below, in just a few lines we've added 2 validations on a field that:

* must be a valid index name (try adding a "?" or "/" character so see the validation)
* cannot be empty

```js
import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  fieldValidators,
  ...
} from '<path-to-form-lib>';

const { emptyField, indexNameField } = fieldValidators;

const nameConfig: FieldConfig<MyForm, string> = {
  validations: [
    {
      validator: emptyField('The name cannot be empty,'),
    },
    {
      validator: indexNameField(i18n),
    },
  ],
};

export const ReusableValidations = () => {
  const { form } = useForm<MyForm>();

  return (
    <Form form={form}>
      <UseField<string> path="name" config={nameConfig}>
        {(field) => {
          const isInvalid = !field.isChangingValue && field.errors.length > 0;
          return (
            <>
              <EuiFieldText
                isInvalid={isInvalid}
                value={field.value}
                onChange={field.onChange}
                fullWidth
              />
              {!field.isValid && <div>{field.getErrorsMessages()}</div>}
            </>
          );
        }}
      </UseField>
    </Form>
  );
};
```

## Asynchronous validation

You can mix synchronous and asynchronous validations. Although it is usually better to first declare the synchronous one(s), this way if any of those ones fails, the asynchronous validation is not executed.

In the example below, if you enter "bad" in the field, the asynchronous validation will fail.

```js
const nameConfig: FieldConfig<MyForm, string> = {
  validations: [
    {
      validator: emptyField('The name cannot be empty,'),
    },
    {
      validator: indexNameField(i18n),
    },
    {
      validator: async ({ value }) => {
        return new Promise((resolve) => {
          setTimeout(() => {
            if (value === 'bad') {
              resolve({ message: 'This index already exists' });
            }
            resolve();
          }, 2000);
        });
      },
    },
  ],
};

export const AsyncValidation = () => {
  const { form } = useForm<MyForm>();
  return (
    <Form form={form}>
      <UseField<string> path="name" config={nameConfig}>
        {(field) => {
          const isInvalid = !field.isChangingValue && field.errors.length > 0;
          return (
            <>
              <EuiFieldText
                isInvalid={isInvalid}
                value={field.value}
                onChange={field.onChange}
                isLoading={field.isValidating}
                fullWidth
              />
              {isInvalid && <div>{field.getErrorsMessages()}</div>}
            </>
          );
        }}
      </UseField>
    </Form>
  );
};
```

### Cancel asynchronous validation

If you need to cancel the previous asynchronous validation before calling the new one, you can do it by adding a `cancel()` handler to the Promise returned.

**Note:** Make sure **to not** use an `async` validator function when returning your Promise, or the `cancel` handler will be stripped out.

```js
const nameConfig: FieldConfig<MyForm, string> = {
  validations: [
    {
      validator: ({ value }) => {
        let isCanceled = false;
        const promise: Promise<any> & { cancel?(): void } = new Promise((resolve) => {
          setTimeout(() => {
            if (isCanceled) {
              console.log('This promise has been canceled, skipping');
              return resolve();
            }

            if (value === 'bad') {
              resolve({ message: 'This index already exists' });
            }
            resolve();
          }, 2000);
        });

        promise.cancel = () => {
          isCanceled = true;
        };

        return promise;
      },
    },
  ],
};

export const CancelAsyncValidation = () => {
  const { form } = useForm<MyForm>();
  return (
    <Form form={form}>
      <UseField<string> path="name" config={nameConfig}>
        {(field) => {
          const isInvalid = !field.isChangingValue && field.errors.length > 0;
          return (
            <>
              <EuiFieldText
                isInvalid={isInvalid}
                value={field.value}
                onChange={field.onChange}
                isLoading={field.isValidating}
                fullWidth
              />
              {isInvalid && <div>{field.getErrorsMessages()}</div>}
            </>
          );
        }}
      </UseField>
    </Form>
  );
};
```

## Typed validation

It is possible to give a `type` to a validation to cover some cases where you need different validation type for the same field. Let's imagine that we have a form field to enter "tags" (an array of string). The array cannot be left empty and the tags cannot contain the "?" and "/" characters.

The field `value` is an array of string, and the default (not typed) validation(s) will run against this array of string. We are going to use a typed validation for the array items.

**Note:** Typed validation are not executed when the field value changes, we need to manually validate the field with `field.validate(...)`.

```js
const tagsConfig: FieldConfig<MyForm, string[]> = {
  defaultValue: [],
  validations: [
    // Validator for the Array
    { validator: emptyField('You need to add at least one tag') },
    {
      // Validator for the Array item
      validator: containsCharsField({
        message: ({ charsFound }) => {
          return `Remove the char ${charsFound.join(', ')} from the field.`;
        },
        chars: ['?', '/'],
      }),
      // We give a custom type to this validation.
      // This validation won't be executed when the field value changes (items being added or removed to the array).
      // This means that we will need to manually call field.validate({ validationType: 'arrayItem }).
      type: 'arrayItem',
    },
  ],
};

export const ValidationWithType = () => {
  const onSubmit: FormConfig['onSubmit'] = async (data, isValid) => {
    console.log('Is form valid:', isValid);
    console.log('Form data', data);
  };

  const { form } = useForm<MyForm>({ onSubmit });

  return (
    <Form form={form}>
      <UseField<string[]> path="tags" config={tagsConfig}>
        {(field) => {
          // Look for error message on **both** the default validation and the "arrayItem" type
          const errorMessage =
            field.getErrorsMessages() ?? field.getErrorsMessages({ validationType: 'arrayItem' });

          const onCreateOption = (value: string) => {
            const { isValid } = field.validate({
              value: value as any,
              validationType: 'arrayItem', // Validate  **only** this validation type against the value provided
            }) as { isValid: boolean };

            if (!isValid) {
              // Reject the user's input.
              return false;
            }

            field.setValue([...field.value, value]);
          };

          const onChange = (options: EuiComboBoxOptionOption[]) => {
            field.setValue(options.map((option) => option.label));
          };

          const onSearchChange = (value: string) => {
            if (value !== undefined) {
              // Clear immediately the "arrayItem" validation type
              field.clearErrors('arrayItem');
            }
          };

          return (
            <>
              <EuiComboBox
                noSuggestions
                placeholder="Type and then hit ENTER"
                selectedOptions={field.value.map((v) => ({ label: v }))}
                onCreateOption={onCreateOption}
                onChange={onChange}
                onSearchChange={onSearchChange}
                fullWidth
              />
              {!field.isValid && <div>{errorMessage}</div>}
              <button onClick={form.submit}>Submit</button>
            </>
          );
        }}
      </UseField>
    </Form>
  );
};
```

Great, but that's **a lot** of code for a simple tags field input. Fortunatelly the `<ComboBoxField />` helper component takes care of all the heavy lifting for us. The above component can simply be:

```js
const tagsConfig: FieldConfig<MyForm, string[]> = {
  defaultValue: [],
  validations: [
    { validator: emptyField('You need to add at least one tag')},
    {
      validator: containsCharsField({
        message: ({ charsFound }) => {
          return `Remove the char ${charsFound.join(', ')} from the field.`;
        },
        chars: ['?', '/'],
      }),
      // Make sure to use the "ARRAY_ITEM" constant
      type: VALIDATION_TYPES.ARRAY_ITEM,
    },
  ],
};

export const ValidationWithTypeComboBoxField = () => {
  const onSubmit: FormConfig['onSubmit'] = async (data, isValid) => {
    console.log('Is form valid:', isValid);
    console.log('Form data', data);
  };

  const { form } = useForm<MyForm>({ onSubmit });

  return (
    <Form form={form}>
      <UseField<string[]> path="tags" config={tagsConfig} component={ComboBoxField} />
      <button onClick={form.submit}>Submit</button>
    </Form>
  );
};
```

Much better! :blush: