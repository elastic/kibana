---
id: about
title: Core
sidebar_label: Getting started
---

The core exposes the main building blocks (hooks and components) needed to build your form.

It is important to note that the core **is not** responsible of the rendering in the UI. Its resposibility is to return form and fields **state and handlers** that you will then have to connect to your React components. With that said, as in Kibana we work with [the EUI component library](https://elastic.github.io/eui), we do have UI fields component that wrap the EUI components where the connection with the form lib is already done for you.
The takeaway is: the core of the form lib is agnostic of any UI rendering the form.

## Getting started

The three required component to build a form are

- `useForm()` hook to declare a form
- `<Form />` component to create a context for your form
- `<UseField />` component to declare a field

Let's see them in action before going into details

```js
import { useForm, Form, UseField } from 'src/plugins/es_ui_shared/public';

export const UserForm = () => {
  const { form } = useForm(); // 1

  return (
    <Form form={form}> // 2
      <UseField path="name" /> // 3 
      <UseField path="lastName" />

      <button onClick={form.submit}>Submit</button>
    </Form>
  );
};
```

1. We use the `useForm` hook to declare a new form.
2. We then wrap our form with the `<Form />` component, providing the `form` that we have just created.
3. Finally, we declared two fields with the `<UseField />` component, providing a unique `path` for each one of them.

If you were to run this code in the browser nothing would happen as we haven't defined yet any handler to execute when submitting the form. Let's do that now along with providing a `UserFormData` interface to the form, which we will get back in our `onSubmit` handler.

```js
import { useForm, Form, UseField, FormConfig } from 'src/plugins/es_ui_shared/public';

interface UserFormData {
  name: string;
  lastName: string;
}

export const UserForm = () => {
  const onFormSubmit: FormConfig<UserFormData>['onSubmit'] = async (data, isValid) => {
    console.log("Is form valid:", isValid);
    console.log("Form data", data);
  };

  const { form } = useForm({ onSubmit: onFormSubmit });

  return (
    <Form form={form}>
      ...
    </Form>
  );
};
```

Great! We have our first working form. No state to worry about, just a simple declarative way to build our fields.

Those of you who are attentive might have noticed that the above form _does_ render in the UI the fields although we said earlier that the core of the form lib was not responsile for any rendering. This is because the `<UseField />` has a fallback mechanism to render an `<input type="text" />` and hook the field `value` and `onChange` to it. Unless you have styled your `input` elements and don't require other field types like `checkbox` or `select`, you probably want to customize how the the `<UseField />` is rendered. We will see that in a future section.
