# Saved Object Migrations

Migrations are the mechanism by which saved object indices are kept up to date with the Kibana system. Plugin authors write their plugins to work with a certain set of mappings, and documents of a certain shape. Migrations ensure that the index actually conforms to those expectations.

## Migrating the index

When Kibana boots, prior to serving any requests, it performs a check to see if the kibana index needs to be migrated.

* It searches the index for documents that are out of date, and it diffs the persisted index mappings with the mappings defined by the current system.
* If the Kibana index does not exist, it is created.
* If there are out of date docs, or breaking mapping changes, or the current index is not aliased, the index is migrated.
* If there are minor mapping changes, such as adding a new property, the new mappings are applied to the current index.

All of this happens prior to Kibana serving any http requests.

Here is the gist of what happens if an index migration is necessary:

* If `.kibana` (or whatever the Kibana index is named) is not an alias, it will be converted to one:
  * Reindex `.kibana` into `.kibana_1`
  * Delete `.kibana`
  * Create an alias `.kibana` that points to `.kibana_1`
* Create a `.kibana_2` index
* Copy all documents from `.kibana_1` into `.kibana_2`, running them through any applicable migrations
* Point the `.kibana` alias to `.kibana_2`

## Migrating Kibana clusters

If Kibana is being run in a cluster, migrations will be coordinated so that they only run on one Kibana instance at a time. This is done in a fairly rudimentary way. Let's say we have two Kibana instances, kibana1 and kibana2.

* kibana1 and kibana2 both start simultaneously and detect that the index requires migration
* kibana1 begins the migration and creates index `.kibana_4`
* kibana2 tries to begin the migration, but fails with the error `.kibana_4 already exists`
* kibana2 logs that it failed to create the migration index, and instead begins polling
  * Every few seconds, kibana2 instance checks the `.kibana` index to see if it is done migrating
  * Once `.kibana` is determined to be up to date, the kibana2 instance continues booting

In this example, if the `.kibana_4` index existed prior to Kibana booting, the entire migration process will fail, as all Kibana instances will assume another instance is migrating to the `.kibana_4` index. This problem is only fixable by deleting the `.kibana_4` index.

## Import / export

If a user attempts to import FanciPlugin 1.0 documents into a Kibana system that is running FanciPlugin 2.0, those documents will be migrated prior to being persisted in the Kibana index. If a user attempts to import documents having a migration version that is _greater_ than the current Kibana version, the documents will fail to import.

## Validation

It might happen that a user modifies their FanciPlugin 1.0 export file to have documents with a migrationVersion of 2.0.0. In this scenario, Kibana will store those documents as if they are up to date, even though they are not, and the result will be unknown, but probably undesirable behavior.

Similarly, Kibana server APIs assume that they are sent up to date documents unless a document specifies a migrationVersion. This means that out-of-date callers of our APIs will send us out-of-date documents, and those documents will be accepted and stored as if they are up-to-date.

To prevent this from happening, migration authors should _always_ write a [validation](../validation) function that throws an error if a document is not up to date, and this validation function should always be updated any time a new migration is added for the relevent document types.

## Document ownership

In the eyes of the migration system, only one plugin can own a saved object type, or a root-level property on a saved object.

So, let's say we have a document that looks like this:

```js
{
  type: 'dashboard',
  attributes: { title: 'whatever' },
  securityKey: '324234234kjlke2',
}
```

In this document, one plugin might own the `dashboard` type, and another plugin might own the `securityKey` type. If two or more plugins define securityKey migrations `{ migrations: { securityKey: { ... } } }`, Kibana will fail to start.

To write a migration for this document, the dashboard plugin might look something like this:

```js
uiExports: {
  migrations: {
    // This is whatever value your document's "type" field is
    dashboard: {
      // Takes a pre 1.9.0 dashboard doc, and converts it to 1.9.0
      '1.9.0': (doc) => {
        doc.attributes.title = doc.attributes.title.toUpperCase();
        return doc;
      },

      // Takes a 1.9.0 dashboard doc, and converts it to a 2.0.0
      '2.0.0': (doc) => {
        doc.attributes.title = doc.attributes.title + '!!!';
        return doc;
      },
    },
  },
  // ... normal uiExport stuff
}
```

After Kibana migrates the index, our example document would have `{ attributes: { title: 'WHATEVER!!' } }`.

Each migration function only needs to be able to handle documents belonging to the previous version. The initial migration function (in this example, `1.9.0`) needs to be more flexible, as it may be passed documents of any pre `1.9.0` shape.

## Disabled plugins

If a plugin is disbled, all of its documents are retained in the Kibana index. They can be imported and exported. When the plugin is re-enabled, Kibana will migrate any out of date documents that were imported or retained while it was disabled.

## Configuration

Kibana index migrations expose a few config settings which might be tweaked:

* `migrations.scrollDuration` - The [scroll](https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-scroll.html#scroll-search-context) value used to read batches of documents from the source index. Defaults to `15m`.
* `migrations.batchSize` - The number of documents to read / transform / write at a time during index migrations
* `migrations.pollInterval` - How often, in milliseconds, secondary Kibana instances will poll to see if the primary Kibana instance has finished migrating the index.

## Example

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

FanciPlugin's uiExports is modified to have a migrations section that looks like this:

```js
uiExports: {
  migrations: {
    // This is whatever value your document's "type" field is
    fanci: {
      // This is the version of the plugin for which this migration was written, and
      // should follow semver conventions. Here, doc is a pre 2.0.0 document which this
      // function will modify to have the shape we expect in 2.0.0
      '2.0.0': (doc) => {
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

Note, the migrationVersion property has been added, and it contains information about what migrations were applied to the document.

## Source code

The migrations source code is grouped into two folders:

* `core` - Contains index-agnostic, general migration logic, which could be reused for indices other than `.kibana`
* `kibana` - Contains a relatively light-weight wrapper around core, which provides `.kibana` index-specific logic

Generally, the code eschews classes in favor of functions and basic data structures. The publicly exported code is all class-based, however, in an attempt to conform to Kibana norms.

### Core

There are three core entry points.

* index_migrator - Logic for migrating an index
* document_migrator - Logic for migrating an individual document, used by index_migrator, but also by the saved object client to migrate docs during document creation
* build_active_mappings - Logic to convert mapping properties into a full index mapping object, including the core properties required by any saved object index

## Testing

Run jest tests:

`node scripts/jest --testPathPattern=migrations --watch`

Run integration tests:

```
node scripts/functional_tests_server
node scripts/functional_test_runner --config test/api_integration/config.js --grep migration
```
