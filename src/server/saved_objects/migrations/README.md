# Saved Object Migrations

Migrations are the mechanism by which saved object indices are kept up to date with the Kibana system. Plugin authors write their plugins to work with a certain set of mappings, and documents of a certain shape. Migrations ensure that the index actually conforms to those expectations.

## How it works

To illustrate how migrations work, let's walk through an example, using a fictional plugin: `FanciPlugin`.

FanciPlugin 1.0 had a mappping that looked like this:

```js
{
  fanci: {
    properties: {
      fanciName: { type: 'keyword' },
    },
  },
}
```

But in 2.0, it was decided that `fanciName` should be renamed to `title`.

So, FanciPlugin 2.0 has a mapping that looks like this:

```js
{
  fanci: {
    properties: {
      title: { type: 'keyword' },
    },
  },
}
```

Note, the `fanciName` property is gone altogether. The problem is that lots of people have used FanciPlugin 1.0, and there are lots of documents out in the wild that have the `fanciName` property. FanciPlugin 2.0 won't know how to handle these documents, as it now expects that property to be called `title`.

To solve this problem, the FanciPlugin authors write a migration which will take all 1.0 documents and transform them into 2.0 documents.

To FanciPlugin's uiExports is modified to look like this:

```js
uiExports: {
  migrations: {
    // This is whatever value your document's "type" field is
    fanci: {
      // This is the version of the plugin for which this migration was written, and
      // should follow semver conventions.
      '2.0.0': (doc) => {
        // Here, we modify doc to have the shape we expect in 2.0.0
        const { fanciName } = doc.attributes;

        delete doc.attributes.fanciName;
        doc.attributes.title = fanciName;

        return doc;
      },
    },
  },
  // ... normal uiExport stuff
}
```

Now, whenever Kibana boots, if FanciPlugin is enabled, Kibana scans its index for any documents that have type 'fanci' and have a `migrationVersion.fanci` property that is anything other than `2.0.0`. If any such documents are found, the index is determined to be out of date (or at least of the wrong version), and Kibana attempts to migrate the index.

At the end of the migration, Kibana's fanci documents will look something like this:

```js
{
  id: 'someid',
  type: 'fanci',
  attributes: {
    title: 'Shazm!',
  },
  migrationVersion: { fanci: '2.0.0' },
}
```

Note, the migrationVersion property has been added, and it contains information about what migrations were applied to it.

## Migrating the index

When Kibana boots, it performs a check to see if it needs to migrate its index.

If the Kibana index does not exist, or if it is out of date, it is migrated whenever Kibana starts, and before Kibana serves any requests. Let's say our index was named `.kibana`, and it is out of date. The following will occur:

* If `.kibana` is not an alias, it will be converted to one:
  * Reindex `.kibana` into `.kibana_original`
  * Delete `.kibana`
  * Create an alias `.kibana` that points to `.kibana_original`
* Create a `.kibana_1` index
* Copy all documents from `.kibana` into `.kibana_1`, running them through any applicable migrations
* Point the `.kibana` alias to `.kibana_1`

If the `.kibana` alias exists, and it does not contain any outdated documents, it will not be migrated, but it will have its mappings patched to ensure they are up to date with the mappings defined by the Kibana system, and Kibana boots normally.

## Migrating Kibana clusters

If Kibana is being run in a cluster, migrations will be coordinated so that they only run on one Kibana instance at a time. This is done in a fairly rudimentary way. Let's say we have two Kibana instances, kibana1 and kibana2.

* kibana1 and kibana2 both start simultaneously and detect that migrations need to run
* kibana1 begins migration and creates index `.kibana_4`
* kibana2 tries to begin migrations, but fails with the error `.kibana_4 already exists`
* kibana2 logs that it failed to create the migration index, and instead begins polling
  * Every few seconds, kibana2 instance checks the `.kibana` index to see if it is done migrating
  * Once `.kibana` is determined to be up to date, the kibana2 instance continues booting

In this example, if the `.kibana_4` index existed prior to Kibana booting, the entire migration process will fail, as all Kibana instances will assume another instance is migrating to the `.kibana_4` index. This problem is only fixable by deleting the `.kibana_4` index (probably after backing it up or reindexing it to another index).

## Import / export

If a user attempts to ipmort FanciPlugin 1.0 documents into a Kibana system that is running FanciPlugin 2.0, those documents will be migrated prior to being persisted in the Kibana index.

## Validation

It might happen that a user modifies their FanciPlugin 1.0 export file to have fanci documents with a migrationVersion of 2.0.0. In this scenario, Kibana will store those documents as if they are up to date, even though they are not, and the result will be unspecified behavior.

Similarly, Kibana server APIs assume that they are sent up to date documents, unless a document specifies a migrationVersion. This means that out-of-date callers of our APIs will send us out-of-date documents, and those documents will be accepted and stored as if they are up-to-date.

To prevent this problem from happening, migration authors should _always_ write a [validation](../validation) function that throws an error if a document is not up to date, and this validation function should always be updated any time a new migration is added for the relevent document types.

## Document ownership

In the eyes of the migration system, only one plugin can own a saved object type, or a root-level property on a saved object.

So, let's say we have a document that looks like this:

```js
{
  type: 'dashboard',
  attributes: { whatever: 'here' },
  securityKey: '324234234kjlke2',
}
```

In this document, one plugin might own the `dashboard` type, and another plugin might own the `securityKey` type. If two or more plugins define migrations `{ migrations: { securityKey: { ... } } }`, Kibana will fail to start.

## Disabled plugins

If a plugin is disbled, all of its documents are retained in the Kibana index. They can be imported and exported. When the plugin is re-enabled, Kibana will migrate any out of date documents that were imported or retained while it was disabled.

## Configuration

Kibana index migrations expose a few config settings which might be tweaked:

* `migrations.scrollDuration` - The [scroll](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-scroll.html#scroll-search-context) value used to read batches of documents from the source index. Defaults to `15m`.
* `migrations.batchSize` - The number of documents to read / transform / write at a time during index migrations
* `migrations.pollInterval` - How often, in milliseconsds, secondary Kibana instances will poll to see if the primary Kibana instance has finished migrating the index.

## Source code

The migrations source code is grouped into two folders:

* `core` - Contains index-agnostic, general migration logic, which could be reused for indices other than `.kibana`
* `kibana` - Contains a relatively light-weight wrapper around core, which provides `.kibana` index-specific logic

Generally, the code eschews classes in favor of functions and basic data structures. The publicly exported code is all class-based, however, in an attempt to conform to Kibana norms.

### Core

A high-level overview of the core folder follows. Each file in the core folder contains fairly detailed comments, if more info is desired.

* `build_active_mappings.ts` - Contains logic to build the index mappings object
* `call_cluster.ts` - This is just a TypeScript definitions file, really, defining the elasticsearch.js subset used by the migration codebase
* `document_migrator.ts` - Logic for migrating individual documents
* `elastic_index.ts` - An uuber class that exposes methods for querying and modifying an elastic search index
* `index_migrator.ts` - This is the meat and potatoes, the logical flow that manages the migration of an index
* `migration_coordinator.ts` - A function which attempts to run a migration, and if it gets an index exists error, falls back to a polling mechanism to wait for another Kibana instance to finish migrating the index
* `migration_logger.ts` - The basic logging mechanism used by index migrations
* `saved_objects.ts` - Utility functions for converting documents to / from the saved object format

## Testing

Run jest tests: `node scripts/jest --testPathPattern=migrations --watch`
