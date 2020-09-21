---
id: serializers_deserializers
title: Serializers & Deserializers
sidebar_label: Serializers & Deserializers
---

* **Deserializer**: A function that converts the form default value provided to the internal state object.
* **Serializer**: A function that converts the internal state object to the expected form interface.

```js
interface MyForm {
  name: string;
  // The "dynamic" parameter can have 3 values (true, false, "strict").
  // Ww¡e will use a toggle field + a checkbox to help the user define it
  dynamic: boolean | 'strict'; 
  _meta?: { [key: string]: any };
}

// This is the internal fields we will need in our form
interface MyFormUI {
  name: MyForm['name'];
  _meta?: string; // the JSON editor work with string and not objects
  isStrict: boolean; // New field
  isDynamic: boolean; // New field
  showAdvancedSettings: boolean; // New field
}

const formDeserializer = ({ name, _meta, dynamic }: MyForm): MyFormUI => {
  const isDynamic = dynamic !== false;
  const isStrict = dynamic === 'strict';
  const showAdvancedSettings = _meta !== undefined;

  return {
    name,
    _meta: _meta === undefined ? undefined : JSON.stringify(_meta, null, 2),
    isDynamic,
    isStrict,
    showAdvancedSettings,
  };
};

const formSerializer = ({ name, isStrict, isDynamic, _meta }: MyFormUI): MyForm => {
  const dynamic = isStrict ? 'strict' : isDynamic;

  return { name, dynamic, _meta: _meta === undefined ? undefined : JSON.parse(_meta) };
};

const { isJsonField } = fieldValidators;

const schema: FormSchema<MyFormUI> = {
  name: { label: 'Name' },
  isDynamic: { label: 'Dyamic fields' },
  isStrict: {
    label: 'Strict',
    helpText: 'Throw an exception when a document contains an unmapped field',
  },
  _meta: {
    label: 'Meta',
    defaultValue: '{\n\n}',
    validations: [
      {
        // Make sure to add the validation so the serializer above
        // receives a valid JSON to be able to parse it.
        validator: isJsonField('The JSON is invalid'),
      },
    ],
  },
  showAdvancedSettings: {
    label: 'Show advanced settings',
  },
};

export const SerializersAndDeserializers = () => {
  // Data coming from the server
  const fetchedData: MyForm = {
    name: 'My resource',
    dynamic: 'strict',
    _meta: { foo: 'bar' },
  };

  const { form } = useForm<MyForm, MyFormUI>({
    defaultValue: fetchedData,
    schema,
    deserializer: formDeserializer,
    serializer: formSerializer,
  });

  const [{ isDynamic, showAdvancedSettings }] = useFormData({
    form,
    watch: ['isDynamic', 'showAdvancedSettings'],
  });

  const submitForm = async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      console.log(data);
    }
  };

  return (
    <Form form={form}>
      <UseField path="name" component={TextField} />
      <UseField path="isDynamic" component={ToggleField} />
      {isDynamic !== false && <UseField path="isStrict" component={CheckBoxField} />}

      <UseField path="showAdvancedSettings" component={ToggleField} />

      <EuiSpacer />
      {/* We don't remove it from the DOM as we would lose the value entered in the field. */}
      <div style={{ display: showAdvancedSettings ? 'block' : 'none' }}>
        <UseField
          path="_meta"
          component={JsonEditorField}
          componentProps={{
            euiCodeEditorProps: {
              height: '200px',
            },
          }}
        />
      </div>
      <EuiSpacer />

      <EuiButton onClick={submitForm} fill disabled={form.isSubmitted && form.isValid === false}>
        Submit
      </EuiButton>
    </Form>
  );
};
```