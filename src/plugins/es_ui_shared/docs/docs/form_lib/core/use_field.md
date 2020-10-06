---
id: use_field
title: <UseField />
sidebar_label: <UseField />
---

To declare a field in the form you use the `<UseField />` component. 

This component accepts the following props (the only required prop is the `path`).

## Props

### path (required)

**Type:** `string`

The field path. It can be any valid [`lodash.set()` path](https://lodash.com/docs/#set).

```js
<UseField path="user.name" />
<UseField path="user.email" />
<UseField path="city" />

// The above 3 fields will output the following object

{
  user: {
    name: 'John',
    email: 'john@elastic.co',
  },
  city: 'Paris'
}
```

### defaultValue

**Type:** `any`

An optional default value for the field. This will be the initial value of the field. The component is not controlled so updating this prop does not have any effect on the field.

**Note:** You can define the field `defaultValue` in different places, [read their differences here](default_value.md).

### config

**Type:** `FieldConfig<FormInterface, ValueType>`

The field configuration.

**Note**: In some cases it makes more sense to declare all your form fields configuration inside a [form schema](use_form_hook.md#schema) that you pass to the form. This will unclutter your JSX.

```js
// It is a good habit to keep the configuration outside the component
// as in most case it is static and so this will avoid unnecessary re-renders.
const nameConfig: FieldConfig<MyForm, string> = {
  label: 'Name',
  validations: [ ... ],
};

export const MyFormComponent = {
  const { form } = useForm(;)
  return (
    <Form form={form}>
      <UseField path="name" config={nameConfig} />
    </Form>
  );
};
```

This configuration has the following parameters.

#### label

**Type:** `string`

A label for the field.

#### labelAppend

**Type:** `string | ReactNode`

An second label for the field.

When `<UseField />` is paired with one of [the helper components](../helpers/components) that wrap the EUI form fields, this prop is forwarded to the `<EuiFormRow />` `labelAppend` prop.  As per [the EUI docs](https://elastic.github.io/eui/#/forms/form-layouts): _it adds an extra node to the right of the form label without being contained inside the form label. Good for things like documentation links._

#### helpText

**Type:** `string | ReactNode`

A help text for the field.

#### type

**Type:** `string`

Specify a type for your field. It can be any string, but if you decide to use the `<Field />` helper component, then defining one of the `FIELD_TYPES` will automatically render the correct field for you.

```js
import { Form, UseField, Field, FIELD_TYPES } from '<path-to-form-lib>';

const nameConfig = {
  label: 'Name',
  type: FIELD_TYPES.TEXT,
};

const showSettingsConfig = {
  label: 'Show advanced settings',
  type: FIELD_TYPES.TOGGLE,
};

export const MyFormComponent = () => {
  const { form } = useForm();

  // We use the same "Field" component to render both fields
  // but as their "type" differs, they will render different UI fields.
  return (
    <Form form={form}>
      <UseField path="name" config={nameConfig} component={Field} />
      <UseField path="showSettings" config={showSettingsConfig} component={Field} />
    </Form>
  );
};
```

The above example could be written a bit simpler with a form schema and [the `getUseField` helper](#getusefield).

```js
import { Form, getUseField, Field, FIELD_TYPES } from '<path-to-form-lib>';

const schema = {
  name: {
    label: 'Name',
    type: FIELD_TYPES.TEXT,
  },
  showSettings: {
    label: 'Show advanced settings',
    type: FIELD_TYPES.TOGGLE,
  }
};

const UseField = getUseField({ component: Field });

export const MyFormComponent = () => {
  const { form } = useForm({ schema });

  return (
    <Form form={form}>
      <UseField path="name"  />
      <UseField path="showSettings" />
    </Form>
  );
};
```

#### validations

**Type:** `ValidationConfig[]`

An array of validation to run against the field value. Although it would be possible to have a single validation that does multiple checks, it often makes the code clearer to have single purpose validation that return a single error if there is one.

If any of the validation fails, the other validations don't run unless [the `exitOnFail` parameter](#exitonfail) (`false` by default) is set to `true`.

**Note:** There are already many reusable field validators. Check if there isn't already one for your use case before writing your own.

The `ValidationConfig` accepts the following parameters:

##### validator` (Required

**Type:** `ValidationFunc`  
**Arguments:** `data: ValidationFuncArg`  
**Returns:** `ValidationError | void | Promise<ValidationError> | Promise<void>`

A validator function to execute. It can be synchronous or asynchronous.

**Note:** Have a look a [the validation examples](../examples/validation.md) for different usecases.

This function receives a data argument with the following properties:

* `value` - The field value
* `path` - The field path being validated
* `form.getFormData` - A handler to build the form data
* `form.getFields` - A handler to access the form fields
* `formData` - The raw form data
* `errors` - And array of any previous validation error

##### type

**Type:** `string`

A specific type for the validation. [Read more about typed validation](../examples/validation#typed-validation) in the examples.

##### isBlocking

**Type:** `boolean`
**Default:** `true`

By default all validation are blockers, which means that if they fail, the field `isValid` state is set to `false`. There might be some cases, like when trying to add an item to the ComboBox array, where we don't want to block the UI and set the field as invalid. If the item is not valid we won't add it to the array, but the field is still valid. Thus the validation on the array item is **not** blocking. 

##### exitOnFail

**Type:** `boolean`
**Default:** `true`

By default, when any of the validation fails, the following validation are not executed. If you still want to execute the following validation(s), set the `exitOnFail` to `false`.

#### deserializer

**Type:** `SerializerFunc`

If the type of a field value differs from the type provided as `defaultValue` you can use a `deserializer` to transform the value. This handler is executed, once, on the default value provided right before initializing the field `value` state.

```js
// The country field select options
const countries = [{
  value: 'us',
  label: 'USA',
}, {
  value: 'es',
  label: 'Spain',
}];

const countryConfig = {
  label: 'Country',
  deserializer: (defaultValue: string) => {
    // We return the object our field expects.
    return countries.find(country => country.value === defaultValue);
  }
};

export const MyFormComponent = () => {
  const fetchedData = {
    // The server returns a string, but our field expects
    // an object with a "value" and "label" property.
    country: 'es',
  };

  const { form } = useForm({ defaultValue: fetchedData });

  return (
    <Form form={form}>
      <UseField path="country" config={countryConfig} component={SelectField} />
    </Form>
  )
}
```

#### serializer

**Type:** `SerializerFunc`

This is the reverese process of the `deserializer`. It is only executed when getting the form data (with `form.submit()` or `form.getFormData()`).

```js
// Continuing the example above

const countryConfig = {
  label: 'Country',
  deserializer: (defaultValue: string) => {
    return countries.find(country => country.value === defaultValue);
  },
  serializer: (fieldValue: { value: string; label: string }) => {
    return fieldValue.value;
  },
};
```

#### formatters

**Type:** `FormatterFunc[]`

If you need to format the field value each time it changes you can use a formatter for that. Like with the validations you can provide as many formatters as needed.

**Note:** Only use formatters when you need to change visually how the field value appears in the UI. If you only need the transformed value when submitting the form, it is better to use a `serializer` for that.

Each `FormatterFunc` receives 2 arguments:

* `value` - The field value
* `formData` - The form data

```js
const nameConfig = {
  formatters: [(value: string) => {
    // Capitalize the field value on each key stroke
    return value.toUppercase();
  }],
};
```

#### fieldsToValidateOnChange

**Type:** `string[]` - An array of field paths 
**Default:** `[<current-field-path>]`

By default when a field value changes, it is the only field that is validated. In some cases you might also want to run the validation on another field that is linked.

Don't forget to include the current field path if you update this settings, unless you specifically do not want to run the validations on the current field.

```js
const field1Config = {
  fieldsToValidateOnChange: ['field1', 'field2'],
};

const field2Config = {
  fieldsToValidateOnChange: ['field2', 'field1'],
};
```

#### valueChangeDebounceTime

**Type:** `number`

The minimum time to update the `isChanging` field state. [Read more about this setting](use_form_hook.md#valuechangedebouncetime) in the `useFormHook()`.

### component

**Type:** `FunctionComponent`

The component to render. This component will receive the `field` hook object as props plus any other props that you pass in `componentProps` (see below).

**Note:** You can see examples on how this prop is used in [the "Style fields" page](../examples/style_fields.md#using-the-component-prop).

### componentProps

**Type:** `{ [prop: string]: any }`

If you provide a `component` you can pass here any prop you want to forward to this component.

### readDefaultValueOnForm

**Type:** `boolean`
**Default:** true

By default if you don't provide a `defaultValue` prop to `<UseField />`, it will try to read the default value on [the form `defaultValue` object](use_form_hook.md#defaultvalue). If you want to prevent this behaviour you can set `readDefaultValueOnForm` to false. This can be usefull for dynamic fields, as [you can see in the examples](../examples/dynamic_fields.md).

### onChange

**Type:** `(value:T) => void`

With this handler you can listen to the field value changes. [See the example](../examples/react_to_changes.md#using-the-onchange-handler) in the "React to changes" page.

### children

**Type:** `(field: FieldHook<T>) => JSX.Element`

The (optional) children of `<UseField />` is a function child which receives the field hook. You are then responsible to return a JSX element from that function.  

The docs for the [FieldHook are right here](field_hook.md).

## `getUseField()`

**Arguments:** `props: UseFieldProps` 

In some cases you might find yourself declaring the exact same prop on `<UseField />` for all your fields. (e.g. using the [the `Field` component](../helpers/components#field) everywhere).

You can use the `getUseField` helper to get a `<UseField />` component with predefined props values.

```js
const UseField = getUseField({ component: Field });

const MyFormComponent = () => {
  ...
  return (
    <Form form={form}>
      {/*You now can use it in your JSX without specifying the component anymore */}
      <UseField path="name" />
    </Form>
  );
};
```


## Typescript value type

You can provided the value type (`unknown` by default) on the component. 

```js
<UseField<string> path="name" defaultValue="mustBeAString" />
```

This has implication on the field config provided that has to have the same type.

```js
const nameConfig:FieldConfig<MyForm, string> = { ... };

<UseField<string> path="name" config={nameConfig} />
```