---
id: use_form_data
title: useFormData()
sidebar_label: useFormData()
---

**Returns:** `[rawFormData, () => T]`

Use the `useFormData` hook to access and react to form field value changes. The hook accepts an optional options object.

Have a look at the examples on how to use this hook in [the "React to changes" page](../examples/react_to_changes.md).

## Options

### form

**Type:** `FormHook`  

The form hook object. It is only required to provide the form hook object in your **root form component**.

```js
const RootFormComponent = () => {
  // root form component, where the form object is declared
  const { form } = useForm();
  const [formData] = useFormData({ form });

  return (
    <Form form={form}>
      <ChildComponent />
    </Form>
  );
};

const ChildComponent = () => {
  const [formData] = useFormData(); // no need to provide the form object
  return (
    <div>...</div>
  );
};
```

### watch

**Type:** `string | string[]`  

This option lets you define which field(s) to get updates from. If you don't specify a `watch` option, you will get updates when any form field changes. This will trigger a re-render of your component. If you want to only get update when a specific field changes you can pass it in the `watch`.

```js
// Only get update whenever the "type" field changes
const [{ type }] = useFormData({ watch: 'type' });

// Only get update whenever either the "type" or the "subType" field changes
const [{ type, subType }] = useFormData({ watch: ['type', 'subType'] });
```

## Return

As you have noticed, you get back an array from the hook. The first element of the array is the **raw** form state ([read more about it here](in_out_raw_state.md#raw-data-state)). As a second argument you get a handler to build the form data (which means unflatten the object and run all the `serializer(s)` on the fields and the form).

```js
const [rawFormData, buildFormData] = useFormData();
```