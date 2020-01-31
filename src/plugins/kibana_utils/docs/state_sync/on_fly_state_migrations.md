# On-fly state migrations

When retrieving initial state from storage we can't forget about possible outdated state.
As described in [handling initial state](./initial_state.md), this could be the place where we can apply migrations.

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
```

But in addition it is also possible to apply migrations for any incoming state similar to how described in [handling empty or incomplete state](./empty_or_incomplete_incoming_state.md).

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
No dashboard remount will happen, so, as we need to transition to a new state on-fly, we also need to apply necessary migrations on-fly.
