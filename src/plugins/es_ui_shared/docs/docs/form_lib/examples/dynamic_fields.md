---
id: dynamic_fields
title: Dynamic fields
sidebar_label: Dynamic fields
---

## Basic

Dynamic fields are fields that the user can add or remove in your form. Usually they end up in an array of values or an array of objects.

Let's imagine a form that lets a user enter multiple parent / child relationships.

```js
export const DynamicFields = () => {
  const { form } = useForm();

  const submitForm = () => {
    console.log(form.getFormData());
  };

  return (
    <Form form={form}>
      <UseField path="name" config={{ label: 'Name' }} component={TextField} />
      <EuiSpacer />
      <UseArray path="relationships">
        {({ items, addItem, removeItem }) => {
          return (
            <>
              {items.map((item) => (
                <EuiFlexGroup key={item.id}>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.parent`}
                      config={{ label: 'Parent' }}
                      component={TextField}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.child`}
                      config={{ label: 'Child' }}
                      component={TextField}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      color="danger"
                      onClick={() => removeItem(item.id)}
                      iconType="minusInCircle"
                      aria-label="Remove item"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
              <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                Add relationship
              </EuiButtonEmpty>
              <EuiSpacer />
            </>
          );
        }}
      </UseArray>

      <EuiSpacer />
      <EuiButton onClick={submitForm} fill>
        Submit
      </EuiButton>
    </Form>
  );
};
```

## Validation

If you need to validate the number of items in the array, you can provide a `validations` prop to the `<UseArray />`. If, for example, we require at least one relationship to be provided, we can either:

* Hide the "Remove" button when there is only one relationship
* Add a `validations` prop

The first one is easy, let's look at the second option:

```js
const relationShipsValidations = [
  {
    validator: ({ value }: { value: any[] }) => {
      // "value" correspond to the "items" passed to the children func below
      if (value.length === 0) {
        return {
          message: 'You need to add at least one relationship',
        };
      }
    },
  },
];

const { emptyField } = fieldValidators;
const textFieldValidations = [{ validator: emptyField("The field can't be empty.") }];


export const DynamicFieldsValidation = () => {
  const { form } = useForm();

  const submitForm = async () => {
    const { isValid, data } = await form.submit();

    if (isValid) {
      console.log(data);
    }
  };

  return (
    <Form form={form}>
      <UseField path="name" config={{ label: 'Name' }} component={TextField} />
      <EuiSpacer />
      <UseArray path="relationships" validations={validations}>
        {({ items, addItem, removeItem, error, form: { isSubmitted } }) => {
          const isInvalid = error !== null && isSubmitted;
          return (
            <>
              <EuiFormRow label="Relationships" error={error} isInvalid={isInvalid} fullWidth>
                <>
                  {items.map((item) => (
                    <EuiFlexGroup key={item.id}>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.parent`}
                          config={{ label: 'Parent', validations: textFieldValidations }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.child`}
                          config={{ label: 'Child', validations: textFieldValidations }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeItem(item.id)}
                          iconType="minusInCircle"
                          aria-label="Remove item"
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                </>
              </EuiFormRow>
              <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                Add relationship
              </EuiButtonEmpty>
              <EuiSpacer />
            </>
          );
        }}
      </UseArray>

      <EuiSpacer />
      <EuiButton onClick={submitForm} fill disabled={form.isSubmitted && form.isValid === false}>
        Submit
      </EuiButton>
    </Form>
  );
};
```
