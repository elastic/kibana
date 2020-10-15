# Toast notifications

Use this service to surface toasts in the bottom-right corner of the screen. After a brief delay, they'll disappear. They're useful for notifying the user of state changes. See [the EUI docs](https://elastic.github.io/eui/) for more information on toasts and their role within the UI.

## Importing the module

```js
import { toastNotifications } from 'ui/notify';
```

## Interface

### Adding toasts

For convenience, there are several methods which predefine the appearance of different types of toasts. Use these methods so that the same types of toasts look similar to the user.

#### Default

Neutral toast. Tell the user a change in state has occurred, which is not necessarily good or bad.

```js
toastNotifications.add('Copied to clipboard');
```

#### Success

Let the user know that an action was successful, such as saving or deleting an object.

```js
toastNotifications.addSuccess('Your document was saved');
```

#### Warning

If something OK or good happened, but perhaps wasn't perfect, show a warning toast.

```js
toastNotifications.addWarning('Your document was saved, but not its edit history');
```

#### Danger

When the user initiated an action but the action failed, show them a danger toast.

```js
toastNotifications.addDanger('An error caused your document to be lost');
```

### Removing a toast

Toasts will automatically be dismissed after a brief delay, but if for some reason you want to dismiss a toast, you can use the returned toast from one of the `add` methods and then pass it to `remove`.

```js
const toast = toastNotifications.add('Your document was saved');
toastNotifications.remove(toast);
```

### Configuration options

If you want to configure the toast further you can provide an object instead of a string. The properties of this object correspond to the `propTypes` accepted by the `EuiToast` component. Refer to [the EUI docs](https://elastic.github.io/eui/) for info on these `propTypes`.

```js
toastNotifications.add({
  title: 'Your document was saved',
  text: 'Only you have access to this document',
  color: 'success',
  iconType: 'check',
  'data-test-subj': 'saveDocumentSuccess',
});
```

Because the underlying components are React, you can use JSX to pass in React elements to the `text` prop. This gives you total flexibility over the content displayed within the toast.

```js
toastNotifications.add({
  title: 'Your document was saved',
  text: (
    <div>
      <p>
        Only you have access to this document. <a href="/documents">Edit permissions.</a>
      </p>

      <button onClick={() => deleteDocument()}>
        Delete document
      </button>
    </div>
  ),
});
```

## Use in functional tests

Functional tests are commonly used to verify that a user action yielded a successful outcome. If you surface a toast to notify the user of this successful outcome, you can place a `data-test-subj` attribute on the toast and use it to check if the toast exists inside of your functional test. This acts as a proxy for verifying the successful outcome.

```js
toastNotifications.addSuccess({
  title: 'Your document was saved',
  'data-test-subj': 'saveDocumentSuccess',
});
```
