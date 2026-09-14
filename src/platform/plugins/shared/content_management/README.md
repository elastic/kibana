# Content management

Do not use this for new content types. Use the saved-objects client.

This plugin is a versioned CRUD/search layer for types that already go through it.

## Existing types

Types that already use content management register a `storage` and `version.latest` on the server, and the same id + latest version on the browser. Keep In/Out types and schemas under `common/content_management/vN`. Server storage wraps the saved-objects client and applies `up`/`down` transforms so browser and server versions can skew.

`mSearch` searches multiple registered content types in one request. A type opts in by implementing `storage.mSearch`.

See [`examples/content_management_examples`](../../../../../examples/content_management_examples) for CRUD + versioning (todos) and `mSearch`. Visualizations, saved search, and data views are maintained production types.

## Testing

Many parts of the service are in-memory, so large pieces can be covered with Jest.
