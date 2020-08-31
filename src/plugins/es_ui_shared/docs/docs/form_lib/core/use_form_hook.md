---
id: use_form_hook
title: useForm()
sidebar_label: useForm()
---

**Returns:** [`FormHook`](form_hook.md)

The `useForm` hook is where to declare a new form object. As we have seen in the ["Getting started"](about.md), you can use it without any additional configuration. It does accept an optional `config` object with the following configuration (all parameters are optionals).

## Configuration

### onSubmit(data, isValid)

**Arguments:** `data: T, isValid: boolean`  
**Returns:** `Promise<void>`

The `onSubmit` handler is executed when calling `form.submit()`. It receives the form data and a boolean for the validity of the form.

```js
interface MyFormData {
  name: string;
}

const onFormSubmit = async (data: MyFormData, isValid: boolean): Promise<void> => {
    if (!isValid) {
      // Maybe show a callout
      return;
    }
    // Do anything with the data
    await myApiService.createResource(data);
}
const { form } = useForm<MyFormData>({ onSubmit: onFormSubmit });

// JSX
<button onClick{form.submit}>Send form</button>
```

### defaultValue

**Type:** `Record<string, any>`

The `defaultValue` is an object that you provide to give the initial value for your fields. There are multiple places where you can define the default value of a field, [read the difference between them here](default_value.md).

```js
const fetchedData = { firstName: 'John' };
const { form } = useForm({ defaultValue: fetchedData });
```

### schema

**Type:** `Record<string, FieldConfig>`

Instead of manually providing a `config` object to each `<UseField />`, it is more convenient in most cases to provide a schema to the form with configuration objects at the desired paths.

```js
interface MyForm {
  user: {
    firstName: string;
    lastName: string;
  }
}

const schema: Schema<MyForm> {
  user: {
    firstName: {
      defaultValue: '',
      ... // any other config
    },
    lastName: {
      defaultValue: '',
      ...
    }
  }
};

export const MyComponent = () => {
  const { form } = useForm<MyForm>({ schema });

  // No need to provide the "config" prop on each field,
  // it will be read from the schema
  return (
    <Form form={form}>
      <UseField paht="user.firstName" />
      <UseField paht="user.lastName" />
    </Form>
  );
}
```

### deserializer

This handler lets you  you provide a `defaultValue`, you might want parse the object and transform it (e.g. adding a field) before it is used as `defaultValue` internally ([read more about the "In" state here](in_out_raw_state.md#in-data-state)).  
Let's see it through an example.

```js
import { Form, useForm, Field, getUseField, FIELD_TYPES, FormDataProvider } from '<es_ui_shared>/public';

const UseField = getUseField({ component: Field });

// Data coming from the server
const fetchedData = {
  name: 'John',
  address: {
    street: 'El Camino Real #350'
  }
}

// We want to have a toggle in the UI to display the address _if_ there is one.
// Otherwise the toggle value is "false" and no address is displayed.
// As a convention, we will add internal fields inside an "__internal__" object.
const deserializer = (value) => {
  const internalFields = {
    showAddress: value.hasOwnProperty('address'),
  };

  // We modify the object and add additional fields under __internal__
  return {
    ...value,
    __internal__: internalFields
  };
}

export const MyComponent = ({ fetchedData }: Props) => {
  const onFormSubmit: FormConfig<UserFormData>['onSubmit'] = async (data, isValid) => {
    console.log('Is form valid:', isValid);
    console.log('Form data:', data);
  };

  const { form } = useForm({
    onSubmit: onFormSubmit,
    defaultValue: fetchedData,
    deserializer
  });

  // We can now use our internal field in the UI
  return (
    <Form form={form}>
      <UseField path="name" config={{ type: FieldType:Text }} />
      <UseField path="__internal__.showAddress" config={{ type: FIELD_TYPES.TOGGLE }} />

      {/* Show the street address when the toggle is "true" */}
      <FormDataProvider pathsToWatch="__internal__.showAddress">
        {({ '__internal__.showAddress': showAddress }) => {
          return showAddress ? <UseField path="address.street" /> : null;
        }}
      </FormDataProvider>

      <button onClick={form.submit}>Submit</button>
    </Form>
  )
}
```

### serializer

Serializer is the inverse process of the deserializer. It is executed when we build the form data (when calling `form.submit()` for example).  [Read more about the "Out" state here](in_out_raw_state.md#out-data-state).

If we run the example above for the `deserializer`, and we click on the "Submit" button, we would get this in the console

```
Form data: {
  address: {
    street: 'El Camino Real #350'
  },
  name: 'John',
  __internal__: {
    showAddress: true
  }
}
```

Not exactly what we want. Let's use a `serializer` to remove the `__internal__` object.

```js

const deserializer = (value) => {
  ...
};

  // Remove the __internal__ object from the outputted data
const serializer = (value) => {
  const { __internal__, ...rest } = value;
  return rest;
}

export const MyComponent = ({ fetchedData }: Props) => {
  const onFormSubmit: FormConfig<UserFormData>['onSubmit'] = async (data, isValid) => {
    console.log('Is form valid:', isValid);
    console.log('Form data:', data);
  };

  const { form } = useForm({
    onSubmit: onFormSubmit,
    defaultValue: fetchedData,
    deserializer,
    serializer,
  });

  ...

};
```

Much better, now when we submit the form, the internal fields are not leaked outside when we build the form object.

### id

**Type:** `string`

You can optionally give an id to the form, that will be attached to the `form` object you receive. This can be useful for debugging purpose when you have multiple forms on the page.

### options

**Type:** `{ valueChangeDebounceTime?: number; stripEmptyFields?: boolean }`

#### valueChangeDebounceTime

**Type:**: `number` (ms)
**Default:**: 500

When a field value changes, for example when we hit a key inside a text field, its `isChangingValue` state is set to `true`. Then, after all the validations have run for the field, the `isChangingValue` state is back to `false`. The time it take between those two state change entirely depend on the time it take to run the validations. If the validations are all synchronous, the time will be `0`. If there are some asynchronous validations, (e.g. making an HTTP request to validate the value on the server), the value change time will be the time it takes to run all the async validations.

With this option, you can define the minimum time you'd like to have between the two state change, so the `isChangingValue` state will stay `true` for at least the amount of milliseconds defined here. This is useful for example if you want to display possible errors on the field after a minimum of time has passed.

This setting **can be overriden** on a per-field basis, providing a `valueChangeDebounceTime` in its config object.

```js
const { form } = useForm({ options: { valueChangeDebounceTime: 300 } });

return (
  <UseField<string> path="name">
    {(field) => {
      let isInvalid = false;
      let errorMessage = null;
  
      if (!field.isChangingValue) {
        // Only update this derived state after 300ms of the last key stroke
        isInvalid = field.errors.length > 0;
        errorMessage = isInvalid ? field.errors[0].message : null;
      }
  
      return (
        <div>
          <input type="text" value={field.value} onChange={field.onChange} />
          {isInvalid && <div>{errorMessage}</div>}
        </div>
      );
    }}
  </UseField>
);
```

#### stripEmptyFields

**Type:**: `boolean`
**Default:**: true

With this option you can decide if you want empty string value to be returned by the form.

```js
// stripEmptyFields: true (default)
{
  "firstName": "John"
}

// stripEmptyFields: false
{
  "firstName": "John",
  "lastName": "",
  "role": ""
}
```
