# Saved Object Migrations

This is the system that manages the versioning of saved object indices. It manages changes to the index, including mappings, index templates, and changes to the shape of documents from one version of Kibana to another.

## General migration process

* Store a migrationVersion with each document `{ migrationVersion: { dashboard: '6.4.3' } }`
* When Kibana starts, check if the index needs migrating
  * Run an agg query that counts the number of documents whose migrationVersion does not meet expectations
  * If any are out of date, run migrations
* Index migration
  * Ensure the index is aliased, do a reindex if the index is not aliased
  * Create a destination index to which all documents from the original index will be moved after they are upgraded
    * The destination index gets all mappings defined by enabled plugins as well as any mappings in the old index
    * Con: We never actually delete a mapping :/
    * Pro: We never have to drop docs :)
    * If a plugin wants to "delete" a mapping, they can modify it to be useless: `{ dashboard: { type: 'boolean' } }`
  * Move all docs, passing them through the appropriate migrations
  * Point the alias to the new index and wait for it to refresh
* Multiple Kibana instances are coordinated so that they don't run migrations in parallel
  * This is because allowing all instances to run migrations would lead to edge cases where errors were improperly ignored
  * Coordination is done by creating / deleting a "lock" index `.kibana_migration_lock` where `.kibana` is the configured index name

## Disabled plugins

If a plugin is disabled, we need to know what the last supported version was so that we can reject incoming documents that would make the index inconsistent. To do this:

* Store "migrationVersion" in the mapping \_meta field
  * This is a dictionary of `doc_type: semver`
  * Allows us to know the migration version info of disabled types / plugins

## Saved object API

* Assume docs w/ no migration version are up to date (see [this comment](https://github.com/elastic/kibana/issues/15100#issuecomment-400000325))
* Docs w/ migration version are migrated if need be
* Modify import logic to add an empty migrationVersion property to docs that have no migration version
  * This will force migrations to run on those docs (since docs w/ no migrationVersion are assumed by the REST API to be up to date)
* If we receive a document whose migration version is greater than that of our index,
  * Reject it
* If we receive a CREATE document whose migration version is less than / equal to our index
  * Migrate it if the requisite plugins are available
  * Save it if the requisite plugins are unavailable (this will trigger a full index migration when the plugin is enabled)
* If we receive an UPDATE document whose version is less than our index
  * Reject it

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

## Source code

* `core` - Exposes a catch-all object which can migrate an index or document, and build the mappings for an index
* `kibana_index` - Kibana index-specific migration logic, converts a Kibana server instance into a migrator

Core logic is broken into a handful of modules:

* `core_migrator` - The public face of the core migration logic, exposes functionality to:
  * Migrate a document to the latest version
  * Migrate an elastic index to the latest version
  * Retrieve the mappings supported by the migrator
* `batch_array_reader` - Provides a reader that provides batches of documents from an array
* `batch_index_reader` - Provides a reader that provides batches of documents from an elastic index
* `build_active_mappings` - Builds and validates the index mappings supported by the system
* `build_active_migrations` - Transforms migrations as defined by plugins into a shape that is more optimal for running migrations
* `build_document_transform` - Creates a function which applies migrations to any document which is passed to it
* `elastic_index` - Helper methods for manipulating an elastic index
* `migration_coordinator` - Logic to ensure that a function runs only on one Kibana instance at a time
* `migration_logger` - A simple helper for logging during index migrations
* `index_migrator` - The entry point for migrating all documents (and mappings) in an index
* `saved_objects` - Functions for converting migration documents to / from the saved object client format
* `types` - Type definitions that are used across the various functions, classes, and modules of the migration system

## Testing

Run jest tests: `node scripts/jest --testPathPattern=migrations --watch`
