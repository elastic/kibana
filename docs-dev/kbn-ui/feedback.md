---
navigation_title: Feedback
---

# @kbn/ui-feedback [kbn-ui-feedback]

The UI for One Feedback — a universal way for users to rate their experience and submit feedback from anywhere in {{kib}}. The package is self-contained so it can be distributed to external consumers (for example, Cloud UI) alongside {{kib}} itself.

## Components

It exposes the following components:

* `FeedbackTriggerButton` — a header button that opens the feedback form in a modal.
* `FeedbackContainer` — the feedback form itself, for hosts that manage their own container.
* `FeedbackSuccessToastTitle` and `FeedbackSuccessToastBody` — content for the submission success toast. The host is responsible for mounting these into its toast system.

### Trigger button [kbn-ui-feedback-trigger-button]

The button lives in the global header and opens the form on click. It is disabled until usage collection is opted in.

:::{storybook}
:id: kibana:kbn_ui:feedback--trigger-button
:::

### Feedback form [kbn-ui-feedback-form]

`FeedbackContainer` renders the CSAT buttons, the context-aware questions, and the optional email-contact section.

:::{storybook}
:id: kibana:kbn_ui:feedback--form
:::

### Success toast [kbn-ui-feedback-success-toast]

After a successful submission, hosts should show `FeedbackSuccessToastTitle` and `FeedbackSuccessToastBody`. Pass `surveyUrl` for the research-panel link and `onDismiss` so the "Maybe later" action can close the toast.

:::{storybook}
:id: kibana:kbn_ui:feedback--success-toast
:::

## Usage [kbn-ui-feedback-usage]

The trigger button and form are driven entirely by callbacks, so the host owns data fetching, telemetry, and toasts.

```tsx
import { FeedbackTriggerButton } from '@kbn/ui-feedback';

<FeedbackTriggerButton
  getQuestions={getQuestions}
  getAppDetails={getAppDetails}
  getCurrentUserEmail={getCurrentUserEmail}
  sendFeedback={sendFeedback}
  showToast={showToast}
  checkTelemetryOptIn={checkTelemetryOptIn}
/>;
```

| Prop | Description |
| --- | --- |
| `getQuestions` | Resolves the context-aware questions for an app id. |
| `getAppDetails` | Returns the current app's `title`, `id`, and `url`. |
| `getCurrentUserEmail` | Resolves the current user's email, used to prefill the email field. |
| `sendFeedback` | Persists the submitted feedback. |
| `showToast` | Surfaces success and error toasts to the user. |
| `checkTelemetryOptIn` | Resolves whether usage collection is opted in (`FeedbackTriggerButton` only). |

Questions are defined per application in `@kbn/feedback-registry`. See that package [README](https://github.com/elastic/kibana/blob/main/x-pack/platform/packages/private/feedback-registry/README.md) to register questions.

## Development [kbn-ui-feedback-development]

See [Development](index.md#kbn-ui-development) for how to run the shared Storybook and preview these docs. Run this package's tests with:

```bash
yarn test:jest src/platform/kbn-ui/feedback
```
