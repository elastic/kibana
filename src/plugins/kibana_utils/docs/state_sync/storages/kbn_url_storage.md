# Kbn Url Storage

`KbnUrlStateStorage` is a state storage for `syncState` utility which:

- Keeps state in sync with the url
- Serialises data and stores data in url in 2 different formats:
  1. [Rison](https://github.com/w33ble/rison-node) encoded.
  2. Hashed url. In url we store only the hash from the serialized state, but the state itself is stored in sessionStorage.
     See kibana's advanced option for more context `state:storeInSessionStorage`
- Takes care of listening to url updates and notifies state about updates
- Takes care of batching url updates to prevent redundant browser history records

### Basic Example

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
// in this case, kbnUrlStateStorage updates the url to "/#?_a=(count:2)"
stateContainer.set({ count: 2 });

stop();
```

### Setting up url format option

```ts
const stateStorage = createKbnUrlStateStorage({
  useHash: core.uiSettings.get('state:storeInSessionStorage'), // put full encoded rison or just the hash into the url
});
```

### Passing [history](https://github.com/ReactTraining/history) instance

Under the hood `kbnUrlStateStorage` uses [history](https://github.com/ReactTraining/history) for updating the url and for listening for url updates.
To prevent bugs caused by missing history updates, make sure your app uses 1 instance of history for url changes which may interfere with each other.

For example, if you use `react-router`:

```tsx
const App = props => {
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

// url hasn't been updated yet
setTimeout(() => {
  // now url is actually "/#?_a=(state:1)&_b=(state:2)"
  // and 2 updates were batched into 1 history.push() call
}, 0);
```

For cases, where granular control over url updates is needed, `kbnUrlStateStorage` supports these advanced apis:

- `kbnUrlStateStorage.flush({replace: boolean})` - allows to synchronously apply any pending updates.
  `replace` option allows to use `history.replace()` instead of `history.push()`. Returned boolean indicates if any update happened.
- `kbnUrlStateStorage.cancel()` - cancels any pending updates

### Sharing one instance of `kbnUrlStateStorage`

`kbnUrlStateStorage` is stateful, as it keeps track of pending updates.
So if there are multiple state syncs happening in the time, then one instance of `kbnUrlStateStorage` should be used to make sure the same update queue is used.
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

// correct:

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
