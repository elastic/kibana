---
id: fields_composition
title: Field composition
sidebar_label: Field composition
---

If you need to swap your form fields according to one field value (e.g. the "type" has changed), you can leverage the power of field composition with the form lib.

Let's imagine that we need to build a form to declare a _value_ configuration. This value can either be of type `text`, `float` or `boolean`, and each type has an additional parameter that can be configured.  
We will build a form with a dropdown to select the value **type**, and then accordinglty to the chosen type we will add to the form different configuration fields.

Those are the 3 type of values that the form can generate:

```js
const textType = {
  type: 'text',
  index: true,
  analyzer: 'standard', // specific to this type
};

const floatType = {
  type: 'float',
  index: true,
  coerce: true, // specific to this type
};

const booleanType = {
  type: 'boolean',
  index: true,
  boost: 1.0, // specific to this type
} 
```

We can see that we have a common "index" field in all three configuration, which is a boolean. We will create a reusable component for that field. And then each value has one specific parameter.

Let's start by creating our reusable "index" parameter field.

```js
// index_parameter.tsx
const indexConfig = {
  label: 'Index',
  defaultValue: true,
};

export const IndexParameter = () => {
  return <UseField path="index" config={indexConfig} component={ToggleField} />;
};
```

Now let's create one component for each value type that will expose its parameters. Those components won't have to declare the "type" parameter it is common to all three values and we will put it at the root of the form.

```js
// text_type.tsx
import { IndexParameter } from './index_parameter';

const analyzerConfig = {
  label: 'Analyzer',
  defaultValue: 'standard',
};

export const TextType = () => {
  return (
    <>
      <IndexParameter />
      <UseField path="analyzer" config={analyzerConfig} component={TextField} />
    </>
  );
};
```

```js
// float_type.tsx
import { IndexParameter } from './index_parameter';

const coerceConfig = {
  label: 'Coerce',
  defaultValue: true,
};

export const FloatType = () => {
  return (
    <>
      <IndexParameter />
      <UseField path="corece" config={coerceConfig} component={ToggleField} />
    </>
  );
};
```

```js
// boolean_type.tsx
import { IndexParameter } from './index_parameter';

const boostConfig = {
  label: 'Boost',
  defaultValue: 1.0,
  serializer: parseFloat,
};

export const BooleanType = () => {
  return (
    <>
      <IndexParameter />
      <UseField path="boost" config={boostConfig} component={NumericField} />
    </>
  );
};
```

And finally, let's build our form which will swap those component according to the "type" selected.

```js
import { TextType } from './text_type';
import { FloatType } from './float_type';
import { BooleanType } from './boolean_type';

const typeToCompMap: { [key: string]: React.FunctionComponent } = {
  text: TextType,
  float: FloatType,
  boolean: BooleanType,
};

const typeConfig = {
  label: 'Type',
  defaultValue: 'text',
};

const typeOptions = [
  {
    text: 'text',
  },
  {
    text: 'float',
  },
  {
    text: 'boolean',
  },
];

export const FieldsComposition = () => {
  const { form } = useForm();
  const [{ type }] = useFormData({ form, watch: 'type' });

  const renderTypeFields = () => {
    // Swap form fields according to the chosen type.
    const FieldsForType = typeToCompMap[type as string];
    return <FieldsForType />;
  };

  const submitForm = () => {
    console.log(form.getFormData());
  };

  return (
    <Form form={form}>
      <UseField
        path="type"
        config={typeConfig}
        component={SelectField}
        componentProps={{
          euiFieldProps: { options: typeOptions },
        }}
      />
      {type !== undefined ? renderTypeFields() : null}
      <EuiSpacer />
      <EuiButton onClick={submitForm} fill>
        Submit
      </EuiButton>
    </Form>
  );
};
```
