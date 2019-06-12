# State containers

- [State containers for holding serializable state](./creation.md).
- Each plugin/app that needs runtime state will create a *store* using `store = createStore()`.
- *Store* can be updated using mutators `mutators = store.createMutators({ ... })`.
- *Store* can be connected to React `{Provider, connect} = createContext(store)`.
- In Angular *store* is consumed using `store.get()` and `store.state$`.
- Under-the-hood uses Redux `store.redux` (but you should never need it explicitly).
- See [idea doc](https://docs.google.com/document/d/18eitHkcyKSsEHUfUIqFKChc8Pp62Z4gcRxdu903hbA0/edit#heading=h.iaxc9whxifl5) with samples and rationale.
