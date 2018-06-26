# Saved Object Migrations

This is the system that manages the versioning of saved object indices. It manages changes to the index, including mappings, index templates, and changes to the shape of documents from one version of Kibana to another.

## Source code

Migrations are organized into two folders:

- `kibana_index` - Contains logic that is specific to the Kibana index and which understands Kibana objects such as the kbnServer.
- `core` - The core logic of the migration system, this should always remain index agnostic, and should ideally know nothing about kbnServer, Kibana plugins, etc.


## Testing

Run jest tests: `node scripts/jest --testPathPattern=migrations --watch`


## General migration process

- Store a migrationVersion with each document `{ migrationVersion: { dashboard: '6.4.3' } }`
- On Kibana start, check if the index needs migrating
  - Run an agg query that gets the distinct values for each migrationVersion key / value
  - If any are out of date, migration is necessary, kick off migrations
  - If some are *ahead* of our system, fail to start
- Index migration
  - Ensure the index is aliased, do a reindex if the index is not aliased
  - Create a new index w/ predictive name
  - Keep any mappings from previous index which aren't defined by active plugins
    - Con: We never actually delete a mapping :/
    - Pro: We never have to drop docs :)
    - If a plugin wants to "delete" a mapping, they can modify it to be useless: `{ dashboard: { type: 'boolean' } }`
  - Move all docs, passing them through the appropriate migrations
  - Point the alias to the new index and wait for it to refresh
- Multiple Kibana instances can run migrations in parallel
  - Makes for simpler coordination logic
  - On startup, if migration is needed, and the destination index already exists
    - We'll assume it's due to multi-instance migration or a previously cancelled migration attempt
    - Patch the dest index mappings, just to be safe
    - Begin moving docs over, overwriting any existing docs
  - This does mean that we have to ignore certain classes of failure (e.g. destination index already exists, document failed to write due to version conflict, etc)
    - Ignoring such errors may be unadviseable
    - Alternatively, at a future date, we could disallow multi-instance migration,
      - We would need to coordinate migrations such that only one Kibana instance runs migrations at a time
      - The others poll for completion
      - If the migrating instance fails for some reason, the others will poll indefinitely unless we put a heartbeat in
      - We'd need a `--force-migration` start option, which tells Kibana to recover from a previously failed migration attempt


## Disabled plugins

If a plugin is disabled, we need to know what the last supported version was so that we can reject incoming documents that would make the index inconsistent. To do this:

- Store "migrationVersion" in the mapping _meta field
  - This is a dictionary of `doc_type: semver`
  - Allows us to know the migration version info of disabled types / plugins


## Saved object API

- Assume docs w/ no migration version are up to date (see [this comment](https://github.com/elastic/kibana/issues/15100#issuecomment-400000325))
- Docs w/ migration version are migrated if need be
- Modify import logic to add an empty migrationVersion property to docs that have no migration version
  - This will force migrations to run on those docs (since docs w/ no migrationVersion are assumed by the REST API to be up to date)
- If we receive a document whose migration version is greater than that of our index,
  - Reject it
- If we receive a CREATE document whose migration version is less than / equal to our index
  - Migrate it if the requisite plugins are available
  - Save it if the requisite plugins are unavailable (this will trigger a full index migration when the plugin is enabled)
- If we receive an UPDATE document whose version is less than our index
  - Reject it


## Migration version

Migrations add an index mapping for a `migrationVersion` property which looks something like this:

```js
migrationVersion: '1.2.3',
```

This is stored per-document. Future versions of Kibana may allow multiple plugins to define migrations for a single document type (e.g. maybe a security plugin which adds acls to various documents, and may want to migrate the acl property). If that ends up becoming a reality, we won't need to change the `migrationVersion` mapping; it will simply be used as an array, instead: `migrationVersion: ['dashboard:1.2.3', 'acl:3.4.5']`.

Each migrated index also has a `migrationVersion` which is stored in the index's mapping metdata and is used to quickly determine whether or not an index needs to be migrated. This `migrationVersion` might look something like this:

```js
_meta.migrationVersion: ['dashboard:1.2.3', 'acl:3.4.5']
```

Here, the format is `type:version`. It is stored this way simply so that the index migration version is compatible with the possible future multi-type document `migrationVersion`. If it is ever stored in a document, it won't require an explosion in properties.
