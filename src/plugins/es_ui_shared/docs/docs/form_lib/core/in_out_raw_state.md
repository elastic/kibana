---
id: in_out_raw_state
title: In, Out & Raw data states
sidebar_label: In, Out & Raw data states
---

It is important to understand the different state of the form data as this will help understanding other concepts likes the `serializers` and `deserializers`.

## "Raw" data state

As you have probably noticed when declaring a field with the `<UseField />` component we don't give it a "_name_" but a "_path_". This gives us a lot of flexibility to declare the final shape of the outputted data of our form, as a path can be any valid [`lodash.set()` path](https://lodash.com/docs/#set).

For example

```js

// Given the following interface for the form
interface MyForm {
  user: {
    name: string;
    lastName: string;
  }
}

// You would declare the following field paths
<UseField path="user.name" />
<UseField path="user.lastName" />

// And this would be the raw form data
const rawFormData = {
  'user.name': 'John',
  'user.lastname': 'Snow'
};
```

Now try changing the paths to `user[0]` and `user[1]`, can you guess what the output will be?

Being able to declare fields paths improves performance as the form data is saved as a **flat object**, meaning that updating its state is always an O(1) operation. Only when we submit the form, or when we explicityly ask for it, the final object is built and returned to the consumer.
This also means that, when we listen to form data changes, we will receive both the raw data, and a handler to build the "Out" data state object.

## "Out" data state

The "out" data state data is the object you expect to receive back from the form. To build this object, all the `serializers` provided (at the form or at the field level) are executed against the "In" data state. In the above example, it corresponds to the `interface MyForm`.

## "In" data state

The "In" data state is the state the form internally works with. If a `defaultValue` is provided to the form, this "In" data state will be the result of running all the `deserializers` (at the form or at the field level) against this `defaultValue`.
 This state can diverge from the "Out" data state in **two aspects**:

- The _type_ of a field is different
- The _fields_ of the form diverge (it has less or more fields).

This does not mean it will always be different than the Out state, but in some cases it will.

For example

```js
interface AddressFormData {
  country: string; // we expect a country code (e.g. "ES")
  ...
}

// Internally, the form "Select" component requires the selected option to be an object 
// This will be the internal ("In") state of that field.
interface AddressFormDataIn {
  country: { label: 'España', value: 'ES' }
}
```

```js
// In some cases we might need an extra field to toggle advanced configuration.
// This field is _only_ used in the UI but we don't want it in our outputted form data

interface AddressFormDataIn {
  showEmail: boolean; // this toggle field is only used in the UI and should not be returned by the form
}
```

Once we understand the difference between those three data states it will be easier to understand why we get a "raw" data object, or when to use the `(de)serializers`.