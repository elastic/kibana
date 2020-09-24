---
id: use_array
title: <UseArray />
sidebar_label: <UseArray />
---

Use the `<UseArray />` component whenever you want to let the user add or remove fields in your form. Those fields will always be part of an array. Either an array of _values_, either an array of _objects_.  
If you need those dynamic fields to be returned differently, you can [use a `serializer`](use_field.md#serializer) to transform the array.  
There are no limits to how nested arrays and fields can be.

```js
// You can simply generate a list of string values
const myFormData = {
  tags: ['value1', 'value2', 'value3'];
};

// Or you can generate more complex objects
const myFormData = {
  book: { // path: "book"
    title: 'My book', // path: "book.title"
    tags: [ // path: "book.tags"
      {
        label: 'Tag 1', // path: "book.tags[0].label
        value: 'tag_1', // path: "book.tags[0].value
        colors: [ // path: "book.tags[0].colors
          'green', // path: "book.tags[0].colors[0]
          'yellow' // path: "book.tags[0].colors[1]
        ]
      }
    ]
  }
}
```

**Note:** Have a [look at the examples](../examples/dynamic_fields.md) on how to use `<UseArray />`.

This component accepts the following props (the only required prop is the `path`).

## Props

### path (required)

**Type:** `string`

The array path. It can be any valid [`lodash.set()` path](https://lodash.com/docs/#set).

### initialNumberOfItems

**Type:** `number`
**Default:** 1

Define the number of items you want to have by default in the array. It is only used when there are no `defaultValue` found for the array. If there is a default value found, the number of items will be the length of the array.

Those items are not fields yet, there are objects that you will receive back in the child function (see below).

### validations

**Type:** `FieldConfig['validations']`

Array of validations to run whenever an item is added or removed. This is [the same `validations` configuration](use_field.md#validations) that you define on the field config. The `value` that you receive is the `items` passed down to the child function (see below).

### readDefaultValueOnForm

**Type:** `boolean`
**Default:** true

Flag to indicate if you want to read the array value from [the form `defaultValue` object](use_form_hook.md#defaultvalue).

### children

**Type:** `(formFieldArray: FormArrayField) => JSX.Element`

The children of `<UseArray />` is a function child which receives the form array field. You are then responsible to return a JSX element from that function.

The `FormArrayField` that you get back in the function has the following properties:

* `items` - The array items you can iterate on
* `error` - A string with possible validation error messages concatenated. It is `null` if there are no errors
* `addItem()` - Handler to add a new item to the array
* `removeItem(id: number)` - Handler to remove an item from the array
* `moveItem(source: number, destination: number)` - Handler to reorder items
* `form` - The `FormHook` object