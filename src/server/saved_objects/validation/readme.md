# Saved Object Validations

The saved object client supports validation of documents during create / bulkCreate operations.

This allows us tighter control over what documents get written to the saved object index, and helps us keep the index in a healthy state.

## Creating validations

Plugin authors can write their own validations by adding a `validations` property to their uiExports. A validation is nothing more than a dictionary of `{[prop: string]: validationFunction}` where:

* `prop` - a root-property on a saved object document
* `validationFunction` - a function that takes a document and throws an error if it does not meet expectations.

## Example

```js
// In myFanciPlugin...
uiExports: {
  validations: {
    myProperty(doc) {
      if (doc.attributes.someField === undefined) {
        throw new Error(`Document ${doc.id} did not define "someField"`);
      }
    },

    someOtherProp(doc) {
      if (doc.attributes.counter < 0) {
        throw new Error(`Document ${doc.id} cannot have a negative counter.`);
      }
    },
  },
},
```

In this example, `myFanciPlugin` defines validations for two properties: `myProperty` and `someOtherProp`.

This means that no other plugin can define validations for myProperty or someOtherProp.

The `myProperty` validation would run for any doc that has a `type="myProperty"` or for any doc that has a root-level property of `myProperty`. e.g. it would apply to all documents in the following array:

```js
[
  {
    type: 'foo',
    attributes: { stuff: 'here' },
    myProperty: 'shazm!',
  },
  {
    type: 'myProperty',
    attributes: { shazm: true },
  },
];
```

Validating properties other than just 'type' allows us to support potential future saved object scenarios in which plugins might want to annotate other plugin documents, such as a security plugin adding an acl to another document:

```js
{
  type: 'dashboard',
  attributes: { stuff: 'here' },
  acl: '342343',
}
```
