# Saved Object Migrations

This is the system that manages the versioning of saved object indices. It manages changes to the index, including mappings, index templates, and changes to the shape of documents from one version of Kibana to another.


## What migrations are for

When writing Kibana plugins, you often need to store and load plugin-specific documents in Elasticsearch. Over the course of time, you may want to make changes to the structure of the documents you store. Maybe you want to add a `title` field to them. Or maybe you were storing data in a big `jsonBlob` field, but now want to pull that data out into more appropriately typed fields.

That's where migrations come in. Migrations allow you to write functions that convert your documents from one shape to another.

Between minor versions of Kibana, you can make non-breaking changes to your documents, such as:

- Adding new fields
- Modifying the values stored (but not the types) in your fields (e.g. sanitizing them)

Between major versions, you can make breaking changes:

- Changing all docs of one type to be a different type (e.g. from `dash` to `dashboard`)
- Dropping fields
- Converting fields from one type to another


## Writing a migration

To add a migration to your plugin, simply add a `migrations` property to your plugin definition. Let's say we have a plugin that has the following mapping in Kibana 6:


```js
{
  foo: {
    properties: {
      title: { type: 'text' },
    },
  },
}
```

And in Kibana 7, we add a `desc` property:

```js
{
  foo: {
    properties: {
      title: { type: 'text' },
      desc: { type: 'text' },
    },
  },
}
```

Let's say, too, that we want to make sure that any pre-existing `foo` docs get a default `title` and `desc`. That's where migrations come in. We can write a migration for Kibana 6.x which ensures all `foo` docs have a `title` property with a non-null value. And we can write another migration for Kibana 7.x which ensures these docs also get a `desc` with a non-null value.

Our plugin might look something like this:

```js
return new kibana.Plugin({
  // Other plugin stuff, such as id, uiExports, etc
  migrations: {
    foo: {
      6(doc) {
        return {
          ...doc,
          attributes: {
            ...attributes,
            title: doc.attributes.title || 'This title was added in version 6!',
          },
        };
      },
      7: R.over(R.lensPath(['attributes', 'desc']), (desc) => desc || 'Similar, but uses RamdaJS!'),
    }
  },
});
```


Notice that the `foo` migration has two properties: `6` and `7`. These correspond to Kibana major versions.

In Kibana version 6 (maybe in 6.5), we added a `title` property to our `foo` docs. It is important to note, that our 6.x migration handles the case where it is passed documents that already have a title.

The `7` migration was added at some point in the Kibana 7.x release cycle, and adds a `desc` property to our documents. Again, it gracefully handles the case where it is given a document that has already been migrated to 7.x.


## What happens when you migrate an index

If you look at `migrate_index.ts`, you'll see something like this:

```js
const migrate = pipe(
  skipIfNoIndex,
  skipIfUpToDate,
  failIfIndexIsNewer,
  failIfDestExists,
  failIfUnsupportedTypes,
  convertIndexToAlias,
  createDestIndex,
  migrateDocs,
  pointAliasToDest,
  buildMigrationResult
);
```

This illustrates the major steps in the migration process.

First, are the cases where migration is not actually needed:

- If there is no index, we don't need to migrate, so we skip
- If the index is up to date, we don't need to migrate, so we skip

Next, are the cases where migration cannot proceed due to a failed precondition:

- If the index version is later than Kibana (e.g. the index is 42.0.0, and Kibana is 7.0.0), fail
  - We explicitly disallow trying to run Kibana against an index that was created by a more recent Kibana major version
- When Kibana migrates an index, it creates a new one, named `.kibana-{MAJOR_VERSION}`, where:
  - `.kibana` is whatever the config value is for `kibana.index`
  - `MAJOR_VERSION` is the current major version of Kibana (e.g. 7)
  - If this index already exists, it's not clear what action we should take:
    - Maybe a previous migration attempt failed and lef this index
    - But maybe, the index exists for some other reason
  - It is up to the end-user / operations to delete or rename the offending index and then retry migrations
- If migrations are run without the `dropUnsupportedTypes` set to `true`, and the index contains docs whose types are no longer supported (e.g. belong to disabled or missing plugins), we fail the migration

Lastly, we have the actual migration flow:

- Convert index to alias
  - If the index being migrated is not aliased, we convert it to an alias
  - Let's say the index name is `.kibana` and the current Kibana version is `7.0.0`
  - We'll reindex `.kibana` to `.kibana-{MAJOR_VERSION -1 }` (e.g. `.kibana-6`)
  - (This name may be misleading, so we may consider changing it in the future)
  - Next, we'll delete the `.kibana` index and create an alias called `.kibana` which points to the `.kibana-6` index
- Create destination index (`.kibana-7` in this example)
  - We copy some settings, such as shard settings, etc from the original index
  - We apply any mappings defined by enabled plugins
- Migrate docs from the old index to the new one
  - Before being written to the destination index, each doc is passed through any migration / transforms that are defined by the enabled Kibana plugins
- Point the `.kibana` alias to our destination index (`.kibana-7`)
- Return the result of the migration, which is an object containing stats such as:
  - `elapsedMs` - how long, in milliseconds, did the migration take
  - `docsDropped` - the number of documents that were dropped during migration
  - `docsMigrated` - the number of documents that were migrated from the old index to the new


## Source code

Migrations are organized into two folders:

- `kibana_index` - Contains logic that is specific to the Kibana index and which understands Kibana objects such as the kbnServer.
- `core` - The core logic of the migration system, this should always remain index agnostic, and should ideally know nothing about kbnServer, Kibana plugins, etc.


## Testing

Run jest tests: `node scripts/jest --testPathPattern=migrations --watch`

Run integration tests:

- Start the test server in one terminal: `node scripts/functional_tests_server`
- Run the migration tests: `node scripts/functional_test_runner --config test/api_integration/config.js --grep migration`
