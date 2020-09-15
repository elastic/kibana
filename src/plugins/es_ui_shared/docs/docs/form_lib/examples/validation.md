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
  useFormData,
} from '<path-to-form-lib>';

interface MyForm {
  name: string;
}

const nameValidations: FieldConfig<MyForm, string>['validations'] = [
  {
    validator: ({ value }) => {
      if (value.trim() === '') {
        return {
          message: 'The name field cannot be empty.',
        };
      }
    },
  },
  // You can add as many validaionts as you need. It is better to keep
  // validation single purpose
  ...
];

export const ValidationBasic = () => {
  const { form } = useForm<MyForm>();

  return (
    <Form form={form}>
      <UseField path="name" config={{ validations: nameValidations }}>
        {(field) => {
          return (
            <>
              <input value={field.value} onChange={field.onChange} />
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

Before creating your own validation, check if it does not exist already in our reusable validations.

## Validation with type

## Asynchronous validation

### Cancel asynchronous validation

