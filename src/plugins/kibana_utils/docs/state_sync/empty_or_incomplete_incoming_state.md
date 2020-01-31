# Handling empty or incomplete incoming state

The `syncState` utility syncs with storage to which users have direct access. For example, URL.
User can manually change the url and remove or corrupt important data which application expects.
Or users may programmatically generate urls to Kibana and these generated urls could have mistakes which application can't handle.

`syncState` utility doesn't do any handling for such edge cases and passes whatever received from storage to state container as is.
So it is up to application to decide, how to handle such scenarios. Consider example:

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

// And now user changed the url to (let's assume) "/#?_a=(corrupt:0)"
// on this point state will recieve and update: {corrupt: 0}
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

To help application developers not forget about such edge cases,
`syncState` util sets constraint,
that setter to state container should be able to handle "null" value. (See [signature](../../public/state_sync/state_sync.ts) of `syncState` function).
Incoming `null` value usually mean empty state (e.g. url without `storageKey` query param) or corrupted state which can't be parsed.
So when using `syncState` util applications are required to at least handle incoming `null`
