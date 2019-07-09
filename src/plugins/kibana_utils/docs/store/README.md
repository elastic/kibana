# State containers

- State containers for holding serializable state.
- [Each plugin/app that needs runtime state will create a *store* using `store = createStore()`](./creation.md).
- [*Store* can be updated using mutators `mutators = store.createMutators({ ... })`](./mutators.md).
- [*Store* can be connected to React `{Provider, connect} = createContext(store)`](./react.md).
- [In no-React setting *store* is consumed using `store.get()` and `store.state$`](./getters.md).
- [Under-the-hood uses Redux `store.redux`](./redux.md) (but you should never need it explicitly).
- [See idea doc with samples and rationale](https://docs.google.com/document/d/18eitHkcyKSsEHUfUIqFKChc8Pp62Z4gcRxdu903hbA0/edit#heading=h.iaxc9whxifl5).
