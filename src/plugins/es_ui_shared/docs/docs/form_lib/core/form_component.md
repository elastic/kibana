---
id: form_component
title: <Form />
sidebar_label: <Form />
---

Once you have created [a `FormHook` object](form_hook.md), you can wrap your form with the `<Form />` component.

This component accepts the following props.

## Props

### form (required)

**Type:** `FormHook`

The form hook you've created with `useForm()`;

```js
const MyFormComponent = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      ...
    </Form>
  );
};
```

### FormWrapper

**Type:** `React.ComponentType`
**Default:**: `EuiForm`

This is the component that will wrap your form fields. By default it renders the `<EuiForm />` component.

Any props that you pass to the `<Form />` component, aside from the `form` hook, will be forwarded to that component.

```js
const MyFormComponent = () => {
  const { form } = useForm();

  // "isInvalid" and "error" are 2 props from <EuiForm />
  return (
    <Form form={form} isInvalid={form.isSubmitted && !form.isValid} error={form.getErrors()}>
      ...
    </Form>
  );
};
```

By default, `<EuiForm />` wraps the form with a `<div>`. In some cases you might want proper semantic and wrap your form with the `<form>` element. This also allows the user to submit the form by hitting the "ENTER" key inside a field.

```js
// Create a wrapper component with the <form> element
const FormWrapper = (props: any) => <form {...props} />;

export const MyFormComponent = () => {
  const { form } = useForm();

  // Hitting the "ENTER" key in a textfield will submit the form.
  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    ...
  };

  // Make sure to **not** declare the FormWrapper inline in your prop!
  return (
    <Form form={form} FormWrapper={FormWrapper} onSubmit={submitForm}>
      ...
    </Form>
  );
};
```