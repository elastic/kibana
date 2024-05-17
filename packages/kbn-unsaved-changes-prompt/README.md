# @kbn/unsaved-changes-prompt

This package provides a component that alerts users when they attempt to leave a
page with unsaved changes. It displays a customizable warning message, prompting
users to confirm whether they want to proceed without saving their changes in order
to prevent accidental loss of data.

```typescript
import { UnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

export const SampleForm = () => {
  const { form } = useForm();
  const isFormDirty = useFormIsModified({ form });

  return (
    <>
      <UnsavedChangesPrompt
        hasUnsavedChanges={isFormDirty}
        messageText="You have unsaved changes, are you sure you wanna leave?"
      />
      <Form>
         ....
      </Form>
    </>
  );
};
```
