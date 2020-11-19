# Session Storage

To sync state from state containers to `sessionStorage` use `createSessionStorageStateStorage`.

```ts
import {
  createStateContainer,
  syncState,
  createSessionStorageStateStorage,
} from 'src/plugins/kibana_utils/public';

const stateContainer = createStateContainer({ count: 0 });
const stateStorage = createSessionStorageStateStorage();

const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer,
  stateStorage,
});

start();

// state container change is synced to state storage
// in this case, stateStorage serialises state and stores it in `window.sessionStorage` by key `_a`
stateContainer.set({ count: 2 });

stop();
```

You can also use `createSessionStorageStateStorage` imperatively:

```ts
const stateStorage = createSessionStorageStateStorage();

stateStorage.set('_a', { count: 2 });
stateStorage.get('_a');
```

**Note**: external changes to `sessionStorageStateStorage` or `window.sessionStorage` don't trigger state container updates.
