# Handling empty or incomplete incoming state

Users have direct access to storages where we sync our state to. For example, URL.
User can manually change the URL and remove or corrupt important data which we expect to be there.
Or users may programmatically generate URLs to Kibana and these URLs could have mistakes which application can't handle.

`syncState` utility doesn't do any handling for such edge cases and passes whatever received from storage to state container as is.
So it is up to application to decide, how to handle such scenarios. Consider the example:

```ts
// window.location.href is "/#?_a=(count:0)"
const defaultState = { count: 0 }; // default application state

const stateContainer = createStateContainer(defaultState);
const stateStorage = createKbnUrlStateStorage();

const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer,
  stateStorage,
});

start();

// on this point state in the storage and in the state is out of sync
// state: {count: 0}
// storage: {count: 0}

// And now user changed the URL to (let's assume) "/#?_a=(corrupt:0)"
// on this point state will recieve an update: {corrupt: 0}
```

Application could handle this gracefully by using simple composition during setup:

```ts
const { start, stop } = syncState({
  storageKey: '_a',
  stateContainer: {
    ...stateContainer,
    set: state => stateContainer.set({ ...defaultState, ...state }),
  },
  stateStorage,
});
```

In this case, app will not get into state, which is not shaped as app expects.

To help application developers to not forget about such edge cases,
`syncState` util sets a constraint,
that setter to state container should be able to handle `null` value (see [IStateSyncConfig](../../public/state_sync/types.ts)).
Incoming `null` value from state storage usually means that state is empty (e.g. URL without `storageKey` query param).
So when using `syncState` util applications are required to at least handle incoming `null`.
