# @kbn/unsaved-changes-prompt

The useUnsavedChangesPrompt function is a custom React hook that prompts users with
a confirmation dialog when they try to leave a page with unsaved changes. It blocks
navigation and shows a dialog using the provided openConfirm function. If the user
confirms, it navigates away; otherwise, it cancels the navigation, ensuring unsaved
changes are not lost.


```typescript
import { useUnsavedChangesPrompt } from '@kbn/unsaved-changes-prompt';

export const SampleForm = ({ servicesForUnsavedChangesPrompt }) => {
  const { form } = useForm();
  const isFormDirty = useFormIsModified({ form });

  useUnsavedChangesPrompt({
    hasUnsavedChanges: isFormDirty,
    ...servicesForUnsavedChangesPrompt,
  });

  return (
    <>
      <Form form={form}>
         ....
      </Form>
    </>
  );
};
```