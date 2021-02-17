---
id: fields_composition
title: Field composition
sidebar_label: Field composition
---

If you need to swap your form fields according to one field value (e.g. the "model" has changed), you can leverage the power of field composition with the form lib. It let's you swap fields in your form whenever needed. Any field that **is not in the DOM** is automatically cleared when unmounting and its value won't be returned in the form data.  
If you _do_ need to keep a field value, but hide the field in the UI, then you need to use CSS (`<div style={{ display: isVisible ? 'block' : 'none' }}>...</div>`)

Imagine you're building an app that lets people buy a car online. You want to build a form that lets the user select the model of the car (`sedan`, `golf cart`, `clown mobile`), and based on their selection you'll show a different form for configuring the selected model's options.

Those are the 3 car configurations that the form can output:

```js
// sedan
{
  model: 'sedan',
  used: true,
  plate: 'UIES2021', // unique config for this car
};

// golf cart
{
  model: 'golf_cart',
  used: false,
  forRent: true, // unique config for this car
};

// clown mobile
{
  model: 'clown_mobile',
  used: true,
  miles: 1.0, // unique config for this car
}
```

We can see that we have a common `used` field in all three configuration, which is a boolean. We will create a reusable component for that field. And then each car has one specific config parameter.

Let's start by creating our reusable `used` parameter field.

```js
// used_parameter.tsx

const usedConfig = {
  label: 'Car has been used',
  defaultValue: false,
};

export const UsedParameter = () => {
  return <UseField path="used" config={usedConfig} component={ToggleField} />;
};
```

Now let's create one component for each car that will expose its unique parameter(s). Those components won't have to declare the `model` and the `used` params as they are common to all three cars and we will put them at the root level of the form.

```js
// sedan_car.tsx

const plateConfig = {
  label: 'Plate number',
  // no need to declare the defaultValue as '' _is_ the default
  // defaultValue: '',
};

export const SedanCar = () => {
  return (
    <>
      <UseField path="plate" config={plateConfig} component={TextField} />
    </>
  );
};
```

```js
// golf_cart_car.tsx

const forRentConfig = {
  label: 'The cart is for rent',
  defaultValue: true,
};

export const GolfCartCar = () => {
  return (
    <>
      <UseField path="forRent" config={forRentConfig} component={ToggleField} />
    </>
  );
};
```

```js
// clown_mobile_car.tsx

const milesConfig = {
  label: 'Current miles',
  defaultValue: 1.0,
  serializer: parseFloat,
};

export const ClownMobileCar = () => {
  return (
    <>
      <UseField path="miles" config={milesConfig} component={NumericField} />
    </>
  );
};
```

And finally, let's build our form which will swap those components according to the selected `model`.

```js
import { UsedParameter } from './used_parameter';
import { SedanCar } from './sedan_car';
import { GolfCartCar } from './golf_cart_car';
import { ClownMobileCar } from './clown_mobile_car';

const modelToComponentMap: { [key: string]: React.FunctionComponent } = {
  sedan: SedanCar,
  'golf_cart': GolfCartCar,
  'clown_mobile': ClownMobileCar,
};

const modelConfig = {
  label: 'Car model',
  defaultValue: 'sedan',
};

const modelOptions = [
  {
    text: 'sedan',
  },
  {
    text: 'golf_cart',
  },
  {
    text: 'clown_mobile',
  },
];

export const CarConfigurator = () => {
  const { form } = useForm();
  const [{ model }] = useFormData<{ model: string }>({ form, watch: 'model' });

  const renderCarConfiguration = () => {
    // Select the car configuration according to the chosen model.
    const CarConfiguration = modelToComponentMap[model];
    return <CarConfiguration />;
  };

  const submitForm = () => {
    console.log(form.getFormData());
  };

  return (
    <Form form={form}>
      <UseField
        path="model"
        config={modelConfig}
        component={SelectField}
        componentProps={{
          euiFieldProps: { options: modelOptions },
        }}
      />
      <UsedParameter />
      {model !== undefined ? renderCarConfiguration() : null}

      <EuiSpacer />

      <EuiButton onClick={submitForm} fill>
        Submit
      </EuiButton>
    </Form>
  );
};
```
