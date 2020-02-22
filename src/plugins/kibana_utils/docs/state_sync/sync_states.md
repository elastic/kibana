# Sync states utility

In case you need to sync multiple states or one state to multiple storages, there is a handy util for that.
It saves a bit of boilerplate by returning `start` and `stop` functions for all `syncState` configs at once.

```ts
import {
  createStateContainer,
  syncStates,
  createKbnUrlStateStorage,
  createSessionStorageStateStorage,
} from 'src/plugins/kibana_utils/public';

const stateContainer = createStateContainer({ count: 0 });
const urlStateStorage = createKbnUrlStateStorage();
const sessionStorageStateStorage = createSessionStorageStateStorage();

const { start, stop } = syncStates([
  {
    storageKey: '_a',
    stateContainer,
    stateStorage: urlStateStorage,
  },
  {
    storageKey: '_a',
    stateContainer,
    stateStorage: sessionStorageStateStorage,
  },
]);

start(); // start syncing to all storages at once

stop(); // stop syncing to all storages at once
```
