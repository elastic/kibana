# On-the-fly state migrations

When retrieving initial state from storage we shouldn't forget about possible outdated state.
Consider the scenario, where user launches application from a bookmarked link, which contains outdated state.

Similar to [handling initial state](./initial_state.md) example, applications could handle migrations during Initialization.

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

It is also possible to apply migrations for any incoming state, similar to [handling empty or incomplete state](./empty_or_incomplete_incoming_state.md).

Imagine an edge case scenario, where a user is working in your application, and then pastes an old link for the same application, containing older state with a different structure.
Since no application remount will happen, we need to transition to a new state on-the-fly, by applying necessary migrations.

```ts
import { migrate } from '../app/state_helpers';

const urlStateStorage = createKbnUrlStateStorage();
const initialStateFromUrl = urlStateStorage.get('_a');

// merge default state and initial state and migrate them to current version if needed
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
