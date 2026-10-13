---
navigation_title: Feedback
---

# Register application feedback questions

Define application-specific questions for One Feedback in `@kbn/feedback-registry`. Apps without an entry use the default questions.

For the trigger button, form, and success toast, see the [feedback UI guide](../kbn-ui/feedback.md).

## Register application questions

Define at most two questions in `x-pack/platform/packages/private/feedback-registry/src/questions/<your_app>.ts`:

```ts
import type { FeedbackRegistryEntry } from '@kbn/ui-feedback';

export const questions: FeedbackRegistryEntry[] = [
  {
    id: 'my_app_experience',
    order: 1,
    question: 'Describe your experience',
    placeholder: {
      i18nId: 'xpack.feedbackRegistry.myAppExperiencePlaceholder',
      defaultMessage: 'Describe your experience',
    },
    ariaLabel: {
      i18nId: 'xpack.feedbackRegistry.myAppExperienceAriaLabel',
      defaultMessage: 'Describe your experience',
    },
  },
];
```

Add a lazy loader in `x-pack/platform/packages/private/feedback-registry/src/registry.ts`. The map key is the chrome app id:

```ts
async function myAppLoader() {
  const m = await import('./questions/my_app');
  return m.questions;
}

const feedbackRegistry: FeedbackRegistry = new Map([
  [DEFAULT_REGISTRY_ID, () => import('./questions/default').then((m) => m.questions)],
  ['myApp', myAppLoader],
]);
```

If you are unsure of the app id, open the feedback form on that page and evaluate:

```js
document.querySelector('[data-app-id]')?.getAttribute('data-app-id')
```
