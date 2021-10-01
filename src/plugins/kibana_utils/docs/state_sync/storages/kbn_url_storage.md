# Kbn Url Storage

`KbnUrlStateStorage` is a state storage for `syncState` utility which:

- Keeps state in sync with the URL.
- Serializes data and stores it in the URL in one of the supported formats:
  1. [Rison](https://github.com/w33ble/rison-node) encoded.
  2. Hashed URL: In URL we store only the hash from the serialized state, but the state itself is stored in `sessionStorage`.
     See kibana's advanced option for more context `state:storeInSessionStorage`
- Takes care of listening to the URL updates and notifies state about the updates.
- Takes care of batching URL updates to prevent redundant browser history records.

### Basic Example

With state sync utility:

```ts
import {
  createStateContainer,
  syncState,
  createKbnUrlStateStorage,
} from 'src/plugins/kibana_utils/public';

const stateContainer = createStateContainer({ count: 0 });
const stateStorage = createKbnUrlStateStorage();

const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer,
  stateStorage,
});

start();

// state container change is synced to state storage
// in this case, kbnUrlStateStorage updates the URL to "/#?_a=(count:2)"
stateContainer.set({ count: 2 });

stop();
```

Or just by itself:

```ts
// assuming url is "/#?_a=(count:2)"
const stateStorage = createKbnUrlStateStorage();

stateStorage.get('_a'); // returns {count: a}
stateStorage.set('_a', { count: 0 }); // updates url to "/#?_a=(count:0)"
```

### Setting URL format option

```ts
const stateStorage = createKbnUrlStateStorage({
  useHash: core.uiSettings.get('state:storeInSessionStorage'), // put the complete encoded rison or just the hash into the URL
});
```

### Passing [history](https://github.com/ReactTraining/history) instance

Under the hood `kbnUrlStateStorage` uses [history](https://github.com/ReactTraining/history) for updating the URL and for listening to the URL updates.
To prevent bugs caused by missing history updates, make sure your app uses one instance of history for URL changes which may interfere with each other.

For example, if you use `react-router`:

```tsx
const App = (props) => {
  useEffect(() => {
    const stateStorage = createKbnUrlStateStorage({
      useHash: props.uiSettings.get('state:storeInSessionStorage'),
      history: props.history,
    });

    //....
  });

  return <Router history={props.history} />;
};
```

### Url updates batching

`kbnUrlStateStorage` batches synchronous URL updates. Consider the example.

```ts
const urlStateStorage = createKbnUrlStateStorage();

urlStateStorage.set('_a', { state: 1 });
urlStateStorage.set('_b', { state: 2 });

// URL hasn't been updated yet
setTimeout(() => {
  // now URL is actually "/#?_a=(state:1)&_b=(state:2)"
  // and 2 updates were batched into 1 history.push() call
}, 0);
```

For cases, where granular control over URL updates is needed, `kbnUrlStateStorage` exposes `kbnUrlStateStorage.kbnUrlControls` that exposes these advanced apis:

- `kbnUrlStateStorage.kbnUrlControls.flush({replace: boolean})` - allows to synchronously apply any pending updates.
  `replace` option allows using `history.replace()` instead of `history.push()`.
- `kbnUrlStateStorage.kbnUrlControls.cancel()` - cancels any pending updates.

### Sharing one `kbnUrlStateStorage` instance

`kbnUrlStateStorage` is stateful, as it keeps track of pending updates.
So if there are multiple state syncs happening in the same time, then one instance of `kbnUrlStateStorage` should be used to make sure, that the same update queue is used.
Otherwise it could cause redundant browser history records.

```ts
// wrong:

const { start, stop } = syncStates([
  {
    storageKey: '_a',
    stateContainerA,
    stateStorage: createKbnUrlStateStorage(),
  },
  {
    storageKey: '_b',
    stateContainerB,
    stateStorage: createKbnUrlStateStorage(),
  },
]);

// better:

const kbnUrlStateStorage = createKbnUrlStateStorage();
const { start, stop } = syncStates([
  {
    storageKey: '_a',
    stateContainerA,
    stateStorage: kbnUrlStateStorage,
  },
  {
    storageKey: '_b',
    stateContainerB,
    stateStorage: kbnUrlStateStorage,
  },
]);

// the best:

import { createBrowserHistory } from 'history';
const history = createBrowserHistory();
const kbnUrlStateStorage = createKbnUrlStateStorage({ history });
const { start, stop } = syncStates([
  {
    storageKey: '_a',
    stateContainerA,
    stateStorage: kbnUrlStateStorage,
  },
  {
    storageKey: '_b',
    stateContainerB,
    stateStorage: kbnUrlStateStorage,
  },
]);

<Router history={history} />;
```

### Error handling

Errors could occur both during `kbnUrlStateStorage.get()` and `kbnUrlStateStorage.set()`

#### Handling kbnUrlStateStorage.get() errors

Possible error scenarios during `kbnUrlStateStorage.get()`:

1. Rison in URL is malformed. Parsing exception.
2. useHash is enabled and current hash is missing in `sessionStorage`

In all the cases error is handled internally and `kbnUrlStateStorage.get()` returns `null`, just like if there is no state in the URL anymore

You can pass callback to get notified about errors. Use it, for example, for notifying users

```ts
const kbnUrlStateStorage = createKbnUrlStateStorage({
  history,
  onGetError: (error) => {
    alert(error.message);
  },
});
```

#### Handling kbnUrlStateStorage.set() errors

Possible errors during `kbnUrlStateStorage.set()`:

1. `useHash` is enabled and can't store state in `sessionStorage` (overflow or no access)

In all the cases error is handled internally and URL update is skipped

You can pass callback to get notified about errors. Use it, for example, for notifying users:

```ts
const kbnUrlStateStorage = createKbnUrlStateStorage({
  history,
  onSetError: (error) => {
    alert(error.message);
  },
});
```

#### Helper to integrate with core.notifications.toasts

The most common scenario is to notify users about issues with state syncing using toast service from core
There is a convenient helper for this:

```ts
const kbnUrlStateStorage = createKbnUrlStateStorage({
  history,
  ...withNotifyOnErrors(core.notifications.toasts),
});
```
