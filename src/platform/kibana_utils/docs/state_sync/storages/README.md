# State Storage

Two types of storage compatible with `syncState`:

- [KbnUrlStateStorage](./kbn_url_storage.md) - Serialises state and persists it to URL's query param in rison or hashed format (similar to what AppState & GlobalState did in legacy world).
  Listens for state updates in the URL and pushes updates back to state.
- [SessionStorageStateStorage](./session_storage.md) - Serializes state and persists it to session storage.
