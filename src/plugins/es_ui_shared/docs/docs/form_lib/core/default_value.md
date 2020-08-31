---
id: default_value
title: defaultValue
sidebar_label: defaultValue
---

There are multiple places where you can define the default value of a field. Note that by "default value" we are saying "the initial value" of a field. Once the field is initiated it has its own internal state and can't be controlled.

## Order of precedence

1. As a prop on the `<UseField />`
2. In the `defaultValue` config passed to `useForm({ defaultValue: { ... } })`
3. In the `defaultValue` parameter of the field config (as a `<UseFielld />` prop or inside a form schema)
4. If no default value is found above, it defaults to `""` (empty string)

### As a prop on `<UseField />`

This takes over any other `defaultValue` defined elsewhere. What you provide as prop is what you will have as default value for the field. Remember that the `<UseField />` **is not** a controlled component, so changing the `defaultValue` prop to another value does not have any effect.

```js
// Here we manually set the default value 
<UseField path="user.firstName" defaultValue="John" />
```

### In the `defaultValue` config passed to `useForm()`

The above solution works well for very small forms, but with larger form it is not very convenient to manually add the default value of each field.

```js
// Let's imagine some data coming from the server
const fetchedData = {
  user: {
    firstName: 'John',
    lastName: 'Snow',
  }
}

// We need to manually write each connection, which is not convenient
<UseField path="user.firstName" defaultValue={fetchedData.user.firstName} />
<UseField path="user.lastName" defaultValue={fetchedData.user.lastName} />

// It is much easier to provide the defaultValue for the whole form
const { form } = useForm({ defaultValue: fetchedData });

// And the defaultValue for each field will be automatically mapped to their paths
<UseField path="user.firstName" />
<UseField path="user.lastName" />
```

### In the `defaultValue` parameter of the field config

When you are creating a new resource, the form is empty and there is no data coming from the server to map. You still migth want to define a defaultValue for non text field (checkbox, arrays...)

```js
interface Props {
  fetchedData?: { index: boolean }
}

export const MyComponent = ({ fetchedData }: Props) => {
  // fetchedData can be "undefined" or an object.
  // If it is undefined, then the config.defaultValue will be used
  const { form } = useForm({ defaultValue: fetchedData });

  return (
    <UseField path="index" config={{ defaultValue: true } />
  );
}
```

Or the same but using a form schema

```js
const schema = {
  index: { defaultValue: true }
};

export const MyComponent = ({ fetchedData }: Props) => {
  // 1. If defaultValue is not undefined **and** there is a value at the "index" path, use it
  // 2. otherwise if there is a schema with a config at the "index" path read its defaultValue
  // 3. otherwise use an "" (empty string) - which will throw an error for a checkbox -.
  const { form } = useForm({ schema, defaultValue: fetchedData });

  return (
    <UseField path="index" />
  );
}
```

