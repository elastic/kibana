# @kbn/response-ops-form-generator

Automatically generates form fields from Zod schemas for use within Kibana's `@kbn/es-ui-shared-plugin` form system.

**Important:** This generates form **fields**, not complete forms. Fields must be rendered within Kibana's `<Form>` component.

## Usage

```typescript
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { generateFormFields } from '@kbn/response-ops-form-generator';

const MyFormComponent = () => {
  const { form } = useForm();
  
  const schema = z.object({
    username: z.string(),
    apiKey: z.string(),
  });

  return (
    <Form form={form}>
      {generateFormFields({ schema })}
    </Form>
  );
};
```

## Mental Model

```
Zod Schema → Field Definitions → Widget Components → React Elements
     ↓              ↓                    ↓                  ↓
  z.object()   (validation)        TextWidget       <UseField .../> 
               FieldDefinition    (how to render)     (rendered)
```

**Fields** (data layer) define what to validate → **Widgets** (UI layer) define how to render

## Examples & Documentation

For complete examples and documentation:

```sh
node scripts/storybook response-ops
```

## Development

```sh
# Run Storybook
node scripts/storybook response-ops

# Run tests
node scripts/jest --testPathPattern=form-generator
```
