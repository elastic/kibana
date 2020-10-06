---
id: dynamic_fields
title: Dynamic fields
sidebar_label: Dynamic fields
---

## Basic

Dynamic fields are fields that the user can add or remove in your form. Those fields will end up in an array of _values_ or an array of _objects_.  To enable dynamic fields in your form you use [the `<UseArray />` component](../core/use_array).

Let's imagine a form that lets a user enter multiple parent / child relationships.

```js
export const DynamicFields = () => {
  const todoList = {
    items: [
      {
        title: 'Title 1',
        subTitle: 'Subtitle 1',
      },
      {
        title: 'Title 2',
        subTitle: 'Subtitle 2',
      },
    ],
  };
  const { form } = useForm({ defaultValue: todoList });

  const submitForm = () => {
    console.log(form.getFormData());
  };

  return (
    <Form form={form}>
      <UseArray path="items">
        {({ items, addItem, removeItem }) => {
          return (
            <>
              {items.map((item) => (
                <EuiFlexGroup key={item.id}>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.title`}
                      config={{ label: 'Title' }}
                      component={TextField}
                      // Make sure to add this prop otherwise when you delete
                      // a row and add a new one, the stale values will appear
                      readDefaultValueOnForm={!item.isNew}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <UseField
                      path={`${item.path}.subTitle`}
                      config={{ label: 'Subtitle' }}
                      component={TextField}
                      readDefaultValueOnForm={!item.isNew}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      color="danger"
                      onClick={() => removeItem(item.id)}
                      iconType="minusInCircle"
                      aria-label="Remove item"
                      style={{ marginTop: '28px' }}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              ))}
              <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                Add item
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
const itemsValidations = [
  {
    validator: ({ value }: { value: any[] }) => {
      if (value.length === 0) {
        return {
          message: 'You need to add at least one item',
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
      <UseArray path="items" validations={itemsValidations}>
        {({ items, addItem, removeItem, error, form: { isSubmitted } }) => {
          const isInvalid = error !== null && isSubmitted;
          return (
            <>
              <EuiFormRow label="Todo items" error={error} isInvalid={isInvalid} fullWidth>
                <>
                  {items.map((item) => (
                    <EuiFlexGroup key={item.id}>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.title`}
                          config={{ label: 'Title', validations: textFieldValidations }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <UseField
                          path={`${item.path}.subtitle`}
                          config={{ label: 'Subtitle', validations: textFieldValidations }}
                          component={TextField}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          color="danger"
                          onClick={() => removeItem(item.id)}
                          iconType="minusInCircle"
                          aria-label="Remove item"
                          style={{ marginTop: '28px' }}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ))}
                </>
              </EuiFormRow>
              <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                Add item
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

## Reorder array items

```js
export const DynamicFieldsReorder = () => {
  const { form } = useForm();

  const submitForm = async () => {
    const { data } = await form.submit();
    console.log(data);
  };

  return (
    <Form form={form}>
      <UseArray path="items">
        {({ items, addItem, removeItem, moveItem }) => {
          const onDragEnd = ({ source, destination }: DropResult) => {
            if (source && destination) {
              moveItem(source.index, destination.index);
            }
          };

          return (
            <>
              <EuiFormRow label="Todo items" fullWidth>
                <EuiDragDropContext onDragEnd={onDragEnd}>
                  <EuiDroppable droppableId="1">
                    {items.map((item, idx) => {
                      return (
                        <EuiDraggable
                          spacing="none"
                          draggableId={String(item.id)}
                          index={idx}
                          key={item.id}
                        >
                          {(provided) => {
                            return (
                              <EuiFlexGroup key={item.id}>
                                <EuiFlexItem grow={false}>
                                  <div {...provided.dragHandleProps} style={{ marginTop: '30px' }}>
                                    <EuiIcon type="grab" />
                                  </div>
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <UseField
                                    path={`${item.path}.title`}
                                    config={{ label: 'Title', validations: textFieldValidations }}
                                    component={TextField}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  <UseField
                                    path={`${item.path}.subtitle`}
                                    config={{
                                      label: 'Subtitle',
                                      validations: textFieldValidations,
                                    }}
                                    component={TextField}
                                  />
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>
                                  <EuiButtonIcon
                                    color="danger"
                                    onClick={() => removeItem(item.id)}
                                    iconType="minusInCircle"
                                    aria-label="Remove item"
                                    style={{ marginTop: '28px' }}
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            );
                          }}
                        </EuiDraggable>
                      );
                    })}
                  </EuiDroppable>
                </EuiDragDropContext>
              </EuiFormRow>
              <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                Add item
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