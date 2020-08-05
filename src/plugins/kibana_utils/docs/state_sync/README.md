# State Syncing Utilities

State syncing utilities are a set of helpers for syncing your application state
with URL or browser storage.

They are designed to work together with [state containers](../state_containers). But state containers are not required.

State syncing utilities include:

- `syncState` util which:
  - Subscribes to state changes and pushes them to state storage.
  - Optionally subscribes to state storage changes and pushes them to state.
- Two types of storage compatible with `syncState`:
  - [KbnUrlStateStorage](./storages/kbn_url_storage.md) - Serializes state and persists it to URL's query param in rison or hashed format.
    Listens for state updates in the URL and pushes them back to state.
  - [SessionStorageStateStorage](./storages/session_storage.md) - Serializes state and persists it to session storage.

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

// state container change is synched to state storage
// kbnUrlStateStorage updates the URL to "/#?_a=(count:2)"
stateContainer.set({ count: 2 });

stop();
```

## Demos Plugins

See demos plugins [here](../../../../../examples/state_containers_examples).

To run them, start kibana with `--run-examples` flag.

## Reference

- [Syncing state with URL](./storages/kbn_url_storage.md).
- [Syncing state with sessionStorage](./storages/session_storage.md).
- [Setting up initial state](./initial_state.md).
- [Using without state containers](./no_state_containers.md).
- [Handling empty or incomplete incoming state](./empty_or_incomplete_incoming_state.md).
- [On-the-fly state migrations](./on_fly_state_migrations.md).
- [syncStates helper](./sync_states.md).
- [Helpers for Data plugin (syncing TimeRange, RefreshInterval and Filters)](./data_plugin_helpers.md).
