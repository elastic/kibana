# Content management

Versioned CRUD/search for Kibana content types. Use it instead of the browser saved-objects client when a plugin owns a content type that needs a cached public client, request versioning, and server-side transforms.

Use the saved-objects client directly for one-off server reads, or when you are not exposing a versioned content type to other plugins.

Register the type on **server** (storage + latest version) and **browser** (id + latest version):

```ts
// server
contentManagement.register({
  id: 'todos',
  storage: new TodosStorage(),
  version: { latest: 1 },
});

// browser
contentManagement.registry.register({
  id: 'todos',
  version: { latest: 1 },
});
```

Keep In/Out types and schemas under `common/content_management/vN` and export the latest version from `latest.ts`. Server storage usually wraps the saved-objects client and applies `up`/`down` transforms so browser and server versions can skew.

See [`examples/content_management_examples`](../../../../../examples/content_management_examples).

## Testing

Many parts of the service are in-memory, so large pieces can be covered with Jest.
