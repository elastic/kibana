---
id: components
title: Components
sidebar_label: Components
---

The core of the form lib is UI agnostic. It can be used with any React UI library to render the form fields. As in Elastic we use [the EUI framework](https://elastic.github.io/eui), we have created components that connect our `FieldHook` to the `<EuiFormRow/>` and its corresponding EUI field.

You can import those component and directly use them as `component` prop on your `<UseField />`.

```js
import { Form, useForm, UseField, TextField, ToggleField } from '<path-to-form-lib>';

export const MyFormComponent = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      <UseField path="name" component={TextField} />
      <UseField path="isAdmin" component={ToggleField} />
    </Form>
  );
};
```

As you can see it is very straightforward. If there are any validation error(s) on those fields, they will be correctly set on the underlying `<EuiFormRow/>`, as well as the field `value`, `onChange` handler, label, helpText...

## Fields components

This is the list of component we currently have. This list might grow in the future if we see the need to support additional fields.

* TextField
* TextAreaField
* NumericField
* CheckBoxField
* ToggleField
* ComboBoxField<sup>*</sup>
* SelectField
* SuperSelectField
* MultiSelectField
* RadioGroupField
* RangeField

(*) Currently the `<ComboBoxField />` only support the free form entry of items (e.g a list of "tags" that the user enters). This means that it does not work (yet) **with predefined selections** to chose from.

## `euiFieldProps`

Those helper components have been set to a default state that cover most of our use cases. You can override those defaults by passing new props to the `euiFieldProps`.

```js
<UseField
  path="name"
  component={TextField}
  componentProps={{
    euiFieldProps: {
      fullWidth. false,
      // ... any other <EuiFieldText /> prop override
    }
  }}
/>
```

## `Field` 

There is a special `<Field />` component that you can use if you prefer. If you use this component, it will check [the field `type` configuration](../core/use_field.md#type) and map to the corresponding component in the list above. If the type does not match any known component, a `<TextField />` component is rendered.

It is recommended to use the available `FIELD_TYPES` constant to indicate the type of a field in the `FieldConfig`.

```js
const schema: FormSchema = {
  name: {
    label: 'Name',
    type: FIELD_TYPES.TEXT
  },
  isAdmin: {
    label: 'User is admin',
    type: FIELD_TYPES.CHECKBOX,
  },
  country: {
    label: 'Country,
    type: FIELD_TYPES.SELECT,
  }
};

export const MyFormComponent = () => {
  const { form } = useForm({ schema });

  // You now can use the <Field /> component everywhere
  return (
    <Form form={form}>
      <UseField path="name" component={Field} />
      <UseField path="isAdmin" component={Field} />
      <UseField path="country" component={Field} />
    </Form>
  );
};
```

The above example can be simplified one step further with [the `getUseField` helper](../core/use_field#getusefield).

```js
const schema: FormSchema = {
  name: {
    label: 'Name',
    type: FIELD_TYPES.TEXT
  },
  ...
};

const UseField = getUseField({ prop: Field });

// Nice and tidy form component :)
export const MyFormComponent = () => {
  const { form } = useForm({ schema });

  return (
    <Form form={form}>
      <UseField path="name" />
      <UseField path="isAdmin" />
      <UseField path="country" />
    </Form>
  );
};
```