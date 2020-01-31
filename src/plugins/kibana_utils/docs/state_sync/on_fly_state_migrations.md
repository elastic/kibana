# On-fly state migrations

When retrieving initial state from storage we shouldn't forget about possible outdated state.
Similar to [handling initial state](./initial_state.md) example, applications could handle migrations during initialisation.

```ts
import { migrate } from '../app/state_helpers';
const urlStateStorage = createKbnUrlStateStorage();
const initialStateFromUrl = urlStateStorage.get('_a');

// merge default state and initial state and migrate it to the current version
const initialState = migrate({
  ...defaultState,
  ...initialStateFromUrl,
});

const stateContainer = createStateContainer(initialState);
```

It is also possible to apply migrations for any incoming state similar example in [handling empty or incomplete state](./empty_or_incomplete_incoming_state.md).

```ts
import { migrate } from '../app/state_helpers';

const urlStateStorage = createKbnUrlStateStorage();
const initialStateFromUrl = urlStateStorage.get('_a');

// merge together default state and initial state and migrate it to current version if needed
const initialState = migrate({
  ...defaultState,
  ...initialStateFromUrl,
});

const stateContainer = createStateContainer(initialState);
const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer: {
    ...stateContainer,
    set: state => stateContainer.set(migrate({ ...defaultState, ...state })),
  },
  stateStorage,
});
```

This should cover edge case, when user already have, for example, dashboard opened and then user pastes an older dashboard link into browser window.
No dashboard remount will happen, so, as we are transitioning to a new state on-fly, we are also applying necessary migrations on-fly.
