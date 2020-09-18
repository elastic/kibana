---
id: react_to_changes
title: React to changes
sidebar_label: React to changes
---

## Basic

```js
// From the root component (where the "form" is declared)
export const ReactToChangesBasic = () => {
  const { form } = useForm();

  const [formData] = useFormData({ form });

  return (
    <Form form={form}>
      <UseField path="fistName" config={{ label: 'First name' }} component={TextField} />
      <UseField path="lastName" config={{ label: 'Last name' }} component={TextField} />
      <EuiCode>{JSON.stringify(formData)}</EuiCode>
    </Form>
  );
};

// Inside a child component (no need to pass the form object, it is read from context)
const FormFields = () => {
  const [formData] = useFormData();

  return (
    <>
      <UseField path="fistName" config={{ label: 'First name' }} component={TextField} />
      <UseField path="lastName" config={{ label: 'Last name' }} component={TextField} />
      <EuiCode>{JSON.stringify(formData)}</EuiCode>
    </>
  )
};

export const ReactToChangesBasic = () => {
  const { form } = useForm();

  return (
    <Form form={form}>
      <FormFields />
    </Form>
  );
};
```

## Listen to specific form fields changes

In some cases you only want to listen to some field change and don't want to trigger a re-render of your component on every field value change. You can specify a **watch** (`string | string[]`) parameter for that.

```js
export const ReactToSpecificFields = () => {
  const { form } = useForm();
  const [{ showAddress }] = useFormData({ form, watch: 'showAddress' });

  return (
    <Form form={form}>
      {/* Changing the "name" field won't trigger a re-render */}
      <UseField path="name" config={{ label: 'First name' }} component={TextField} />

      <UseField
        path="showAddress"
        config={{ defaultValue: false, label: 'Show address' }}
        component={ToggleField}
      />
      {showAddress && (
        <>
          <p>800 W El Camino Real #350</p>
        </>
      )}
    </Form>
  );
};
```

## Forward the form state to a parent component

If your UX requires to submit the form in a parent component (e.g. because that's where your submit button is located), you will need a way to access the form validity and the form data outside your form component. Unless your parent component needs to be aware of every field value change in the form (which should rarely be needed), you don't want to use the `useFormData()` hook and forward the data from there. This would create unnecessary re-renders. Instead it is better to forward the `getFormData()` handler on the form.

```js
interface MyForm {
  name: string;
}

interface FormState {
  isValid: boolean | undefined;
  validate(): Promise<boolean>;
  getData(): MyForm;
}

const schema: FormSchema<MyForm> = {
  name: {
    validations: [
      {
        validator: ({ value }) => {
          if (value === 'John') {
            return { message: `The username "John" already exists` };
          }
        },
      },
    ],
  },
};

interface Props {
  defaultValue: MyForm;
  onChange(formState: FormState): void;
}

const MyForm = ({ defaultValue, onChange }: Props) => {
  const { form } = useForm<MyForm>({ defaultValue, schema });
  const { isValid, validate, getFormData } = form;

  useEffect(() => {
    onChange({ isValid, validate, getData: getFormData });
  }, [onChange, isValid, validate, getFormData]);

  return (
    <Form form={form}>
      <UseField path="name" component={TextField} />
    </Form>
  );
};

export const ForwardFormStateToParent = () => {
  // This would probably come from the server
  const formDefaultValue: MyForm = {
    name: 'John',
  };

  const initialState = {
    isValid: true,
    validate: async () => true,
    getData: () => formDefaultValue,
  };

  const [formState, setFormState] = useState<FormState>(initialState);

  const sendForm = useCallback(async () => {
    // The form isValid state will stay "undefined" until all the fields are dirty.
    // This is why we check first if its undefined, and if so  we call the validate() method
    // to trigger the validation on all the fields that haven't been validated yet.
    const isValid = formState.isValid ?? (await formState.validate());
    if (!isValid) {
      // Maybe show a callout?
      return;
    }

    console.log('Form data', formState.getData());
  }, [formState]);

  return (
    <>
      <h1>My form</h1>
      <MyForm defaultValue={formDefaultValue} onChange={setFormState} />
      <EuiButton color="primary" onClick={sendForm} disabled={formState.isValid === false} fill>
        Submit
      </EuiButton>
    </>
  );
};
```