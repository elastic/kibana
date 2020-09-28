---
id: validators
title: Validators
sidebar_label: Validators
---

As you have seen in the `<UseField />` configuration, the validations are objects with [a required `validator` function](../core/use_field#validator-required) attached to them.

After building many forms, we have realized that we are doing almost all the time the same validation on a field: is the field empty? does it contain a character not allowed?, does it start with an invalid character? is it valid JSON? ...

So instead of reinventing the wheel on each form we have exported to most common validators as reusable function that you can use directly in your field validations. Some validator might expose directly the handler to validate, some others expose a function that you need to call with some parameter and you will receive the validator back.

```js
import { fieldValidators } from '<path-to-form-lib>';

const { emptyField } = fieldValidators;

// Some validator expose a function that you need to call to receive the validator handler
const nameConfig: FieldConfig<string> = {
  validations: [{
    validator: emptyField('Your custom error message'),
  }, {
    validator: containsCharsField({
      chars: ' ',
      message: 'Spaces are not allowed in a component template name.',
    })
  }],
};
```

We have validators for valid

* index pattern name
* JSON
* URL
* number
* string start with char
* string contains char
* ...

Before your write your own validator, check (thanks to Typescript suggestions in your IDE) what is already exposed from the `fieldValidators` object.  

And if need to build your own validator and you think that it is common enough for other forms, make a contribution to the form lib and open a PR to add it to our list!
