---
id: form_hook
title: Form hook
sidebar_label: Form hook
---

When you call `useForm()` you receive back a `form` hook object.  
This object has the following properties and handlers

## Properties

### isSubmitted

**Type:** `boolean`

Flag that indicates if the form has been submitted at least once. It is set to `true` when we call `submit()`. ([see below](#submit)).  
**Note:** If you have a dynamic form where fields are removed and added, the `isSubmitted` is set to `false` whenever a new field is added, as in such case the user has a new form in front of him.

### isSubmitting

**Type:** `boolean`

Flag that indicates if the form is being submitted. When we submit the form, if you have provided an [`onSubmit()` handler](use_form_hook.md#onsubmitdata-isvalid) in the config, it might take some time to resolve (e.g. an HTTP request being made). This flag will be set to `true` until the Promise resolves.

### isValid

**Type:** `boolean | undefined`

Flag that indicates if the form is valid. It can have three values:
* `true`
* `false`
* `undefined`

When the form first renders, its validity is neither `true` nor `false`. It is `undefined`, we don't know its validity. It could be valid if none of the fields are required or invalid if some field is required.

Each time a field value changes, it is validated. When **all** fields have changed (are dirty), then only the `isValid` is either `true` or `false`, as at this stage we know the form validity. Of course we will probably need to know the validity of the form without updating each field one by one. There are two ways of doing that:

* calling `form.submit()`

```js
export const MyComponent = () => {
  const { form } = useForm();
  
  const onClickSubmit = async () => {
    // We validate all the form fields and set the "isValid" state to true or false
    const { isValid, data } await form.submit();
  
    if (isValid) {
      // ...
    }
  };
  
  return (
    <Form form={form}>
      ...
      <button onClick={onClickSubmit}>Submit</button>
      {form.isValid === false && (
        <div>Only show this message if the form validity is "false".</div>
      )}
    </Form>
  );
}
```

* calling the `validate()` handler on the form. As you can see in the example below, if you don't use the `form.submit()`, you have to manually declare and update the `isSubmitting` and `isSubmitted` states.

```js
export const MyComponent = ({ onFormUpdate }: Props) => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { form } = useForm<UserFormData>();

  const onClickSubmit = async () => {
    setIsSubmitted(true);
    setIsSubmitting(true);

    // If the "isValid" state is "undefined" (=== not all the fields are dirty),
    // call validate() to run validation on all the fields.
    const isValid = form.isValid ?? (await form.validate());
    setIsSubmitting(false);

    if (isValid) {
      console.log('Form data:', form.getFormData());
    }
  };

  const hasErrors = isSubmitted && form.isValid === false;

  return (
    <Form form={form}>
      <UseField path="firstName" config={{ validations: [{ validator }] }} />
      <UseField path="lastName" />

      <button
        onClick={onClickSubmit}
        disabled={isSubmitting || hasErrors}
      >
        {isSubmitting ? 'Sending...' : 'Submit'}
      </button>
      {hasErrors && <div>Form is invalid.</div>}
    </Form>
  );
};
```

### id

**Type:** `string`

The form id. If none was provided, "default" will be returned.

## Handlers

### submit()

**Returns:** `Promise<{ data: T | {}, isValid: boolean }>`

This handlers submits the form and returns its data and validity. If the form is not valid, the data will be `null` as only valid data is passed through the `serializer(s)` before being returned.

```js
const { data, isValid } = await form.submit();
```

### validate()

**Returns:** `Promise<boolean>`

Use this handler to get the validity of the form.

```js
const isFormValid = await form.validate();
```

### getFields()

**Returns:** `{ [path: string]: FieldHook }`

Access any field on the form.

```js
const { name: nameField }  = form.getFields();
```

### getFormData()

**Arguments:** `options?: { unflatten?: boolean }`  
**Returns:** `T | R`

Return the form data. It accepts an optional options with an `unflatten` parameter (defaults to `true`). If you are only interested in the raw form data, pass `unflatten: false` to the handler ([read more about the "Raw" data state here](in_out_raw_state.md#raw-data-state)).

```js
const formData  = form.getFormData();

const rawFormData  = form.getFormData({ unflatten: false });
```

### getErrors()

**Returns:** `string[]`

Returns an array with of all errors in the form.

```js
const errors  = form.getErrors();
```

### reset()

**Arguments:** `options?: { resetValues?: boolean; defaultValue?: any }` 

Resets the form to its initial state. It accetps an optional object of configuration:

- `resetValues` (default: `true`). Flag to indicate if we want to not only reset the form state (`isValid`, `isSubmitted`...) but also the field values. If set to `true` will put back the default value passed to the form or declared on the field config (in this order).

- `defaultValue`. In some cases you might not want to reset the form the default value initiallly provided to the form (probably because it is data that came from the server and you want a clean form). In this case you can provide a new `defaultValue` object when resetting.

```js
// Reset to the defaultValue object passed to the form
// If none was provided, reset to the field config defaultValue.
form.reset();

// Reset to the default value declared on the field config defaultValue
form.reset({ defaultValue: {} });

// You can keep some current field value and the rest will come from the field config defaultValue.
form.reset({ defaultValue: { type: 'SomeValueToKeep' } });
```

### setFieldValue()

**Arguments:** `fieldName: string, value: unknown` 

Sets a field value imperatively.

```js
form.setFieldValue('name', 'John');
```

### setFieldErrors()

**Arguments:** `fieldName: string, errors: ValidationError[]` 

Sets a field errors imperatively.

```js
form.setFieldErrors('name', [{ message: 'There is an error in the field' }]);
```
