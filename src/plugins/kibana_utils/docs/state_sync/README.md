# State Syncing Utilities

State syncing utilities are a set of helpers for syncing your application state
with URL or browser storage.

They are designed to work together with [state containers](../state_containers). But state containers are not required.

State syncing utilities include:

- `syncState` util which:
  - Subscribes to state changes and pushes them to state storage.
  - Optionally subscribes to state storage changes and pushes them to state.
- 2 storage types for `syncState` util:
  - [KbnUrlStateStorage](./storages/kbn_url_storage.md) - Serialises state and persists it to url's query param in rison or hashed format (similar to what AppState & GlobalState did in legacy world).
    Listens for state updates in the url and pushes updates back to state.
  - [SessionStorageStateStorage](./storages/session_storage.md) - Serialises state and persists it to session storage.

## Example

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

## Demos Plugins

See demos [here](../../../../../examples/state_containers_examples).

To run them, start kibana with `--run-examples` flag

## Reference

- [Syncing state with URL](./storages/kbn_url_storage.md).
- [Syncing state with sessionStorage](./storages/session_storage.md).
- [Setting up initial state](./initial_state.md).
- [Using without state containers]().
- [Handling empty incoming state]().
- [On-fly state migrations]().
- [syncStates helper]().
