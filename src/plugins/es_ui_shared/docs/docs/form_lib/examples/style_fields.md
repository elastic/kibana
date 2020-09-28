---
id: style_fields
title: Style fields
sidebar_label: Style fields
---

## Basic

To its most basic form, you can style your fields by passing props to the `UseField` component that will be applied to an `<input />` in the DOM:



```css
/* my_styles.css */
.text-input {
  color: blue;
  border-radius: 16px;
  padding: 8px;
  border: 1px solid #ccc;
  margin-right: 12px;
}
```

```js
import './my_styles.css';

export const StyleFieldsBasic = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      <UseField path="username" className="text-input" />
      <UseField path="password" type="password" className="text-input" />
    </Form>
  );
};
```

## With chilren prop

The above solution can work with very simple usecases but we might want to display validation errors below the field and change the styling accordingly. For that we can use the "children prop" declaration where we will receive the `FieldHook` back and we'll have all the freedom of styling that we want.

```js
export const StyleFieldsChildrenProp = () => {
  const { form } = useForm();

  // Notice how we have typed the value of the field with <UseField<string> ...>
  return (
    <Form form={form}>
      <UseField<string> path="firstname" config={{ label: 'First name' }}>
        {(field) => {
          // You get back a FieldHook: the styling is all yours!
          const errors = field.getErrorsMessages();
          return (
            <div style={{ border: field.isValid ? 'none' : '1px solid red' }}>
              <label>{field.label}</label>
              <input id="firstName" type="text" value={field.value} onChange={field.onChange} />
              {!field.isValid && <div>{errors}</div>}
            </div>
          );
        }}
      </UseField>
    </Form>
  );
};
```

## Using the "component" prop

The above solution works great, but if we have multiple fields with the same styling and logic, it will be a very repetitive task with with a lot of noise in our JSX. Let's encapsulate the content of the children func into its own component.

```js
// This is exactly what we had in the previous example
export const MyTextField = ({ field }: { field: FieldHook<string> }) => {
  const errors = field.getErrorsMessages();
  return (
    <div style={{ border: field.isValid ? 'none' : '1px solid red' }}>
      <label>{field.label}</label>
      <input id="firstName" type="text" value={field.value} onChange={field.onChange} />
      {!field.isValid && <div>{errors}</div>}
    </div>
  );
};
```

Now we can have multiple fields using this component for styling.

```js
import { MyTextField } from './my_text_field';

export const StyleFieldsComponent = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      <UseField<string> path="firstname" config={{ label: 'First name' }} component={MyTextField} />
      <UseField<string> path="lastname" config={{ label: 'Last name' }} component={MyTextField} />
    </Form>
  );
};
```

And if you need to pass some props to your custom component you can pass them with the `componentProps` prop.

```js
export const StyleFieldsComponent = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      <UseField<string> path="firstname" config={{ label: 'First name' }} component={MyTextField} />
      <UseField<string>
        path="lastname"
        config={{ label: 'Last name' }}
        component={MyTextField}
        componentProps={{ some: 'value' }}
      />
    </Form>
  );
};
```
