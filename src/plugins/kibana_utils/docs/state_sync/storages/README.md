# State Storage

2 storage types are supported:

- [KbnUrlStateStorage](./kbn_url_storage.md) - Serialises state and persists it to url's query param in rison or hashed format (similar to what AppState & GlobalState did in legacy world).
  Listens for state updates in the url and pushes updates back to state.
- [SessionStorageStateStorage](./session_storage.md) - Serialises state and persists it to session storage.
