# Setting up initial state

The `syncState` util doesn't do any initial state syncing between state and storage.
Consider the following scenario:

```ts
// window.location.href is "/#?_a=(count:2)"
const defaultState = { count: 0 }; // default application state

const stateContainer = createStateContainer(defaultState);
const stateStorage = createKbnUrlStateStorage();

const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer,
  stateStorage,
});

start();

// Now the storage and state are out of sync
// state: {count: 0}
// storage: {count: 2}
```

It is up to the application to decide, how initial state should be synced and which state should take precedence, depending on the specific use case.

Questions to consider:

1. Should default state take precedence over URL?
2. Should URL take precedence?
3. Do we have to do any state migrations for what is coming from the URL?
4. If URL doesn't have the whole state, should we merge it with default one or leave it behind?
5. Is there any other state loading in parallel (e.g. from a `SavedObject`)? How should we merge those?
6. Are we storing the state both in the URL and in the `sessionStorage`? Which one should take precedence and in which case?

A possible synchronization for the state conflict above could look like this:

```ts
// window.location.href is "/#?_a=(count:2)"
const defaultState = { count: 0 }; // default application state

const urlStateStorage = createKbnUrlStateStorage();

const initialStateFromUrl = urlStateStorage.get('_a');

// merge the default state and initial state from the url and use it as initial application state
const initialState = {
  ...defaultState,
  ...initialStateFromUrl,
};

const stateContainer = createStateContainer(initialState);

// preserve initial application state in the URL
if (!initialStateFromUrl) {
  urlStateStorage.set('_a', initialState, { replace: true });
}

const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer,
  stateStorage: urlStateStorage,
});

start();

// Now the storage and state are in sync
// state: {count: 2}
// storage: {count: 2}
```
