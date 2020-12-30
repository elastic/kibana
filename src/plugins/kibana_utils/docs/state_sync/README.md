# State Syncing Utilities

State syncing utilities are a set of helpers for syncing your application state
with URL or browser storage.

**When you should consider using state syncing utils:**

- You want to sync your application state with URL in similar manner analyze applications do that.
- You want to follow platform's <<history-and-location, working with browser history and location best practices>> out of the box.
- You want to support `state:storeInSessionStore` escape hatch for URL overflowing out of the box.
- You should also consider using them if you'd like to serialize state to different (not `rison`) format. Utils are composable, and you can implement your own `storage`.
- In case you want to sync part of your state with URL, but other part of it with browser storage.

**When you shouldn't look into using state syncing utils:**

- Adding a query param flag or simple key/value to URL

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

## Demo Plugins

See demo plugins [here](../../../../../examples/state_containers_examples).

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
- [Error handling](./error_handling.md)
