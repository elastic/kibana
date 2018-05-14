# Migrations

Kibana migrations provide a systematic and predictable way to upgrade data from one version of Kibana / plugins to a later version. The system has been designed in such a way that upgrading from one version of Kibana to any other should be possible in one go (at least from the standpoint of upgrading documents in the Kibana index).

The core logic for migrations is index / alias (refered to simply as index from here on) agnostic, but it does make an assumption that the index documents are compatible with the Kibana saved-object-client conventions.

## Why

The main use-case for migrations is changing the mappings or shape of saved object data (e.g. renaming a property or changing it from keyword to text) without littering the codebase with defensive checks for differing versions.

There are two data sources which we need to deal with:

- Data in the existing index
- Data which is imported into the index from an external source (such as a file)


## How it works

There are two types of migrations: seed and transform.

- seed - creates a brand new document and inserts it into the index
- transform - takes an old document (e.g. from `myplugin-1.0`) and transforms it into a new new shape (e.g. for `myplugin-2.0`)


### Determining if migration is needed

In each index that the migration system controls, it stores a document with id `migration:migration-state`. This document is referred to as the index's `migrationState`, and it contains metadata that is used to determine what migrations / mappings have already been applied to an index. It has several properties:

- `status` - is the index migrating or migrated
- `previousIndex` - the name of the previous index (if any), which can be used to rollback or trace the history of migrations
- `plugins` - an array of plugin metadata, including
  - id of the plugin
  - mappings the plugins have applied to the current index
  - migration ids the plugins have applied to the current index
  - checksums of the mappings and migration ids used to quickly determine if the mappings / migration list has changed

To determine if an index needs to be migrated, the migration system compares the plugins in migrationState with the current plugins in the system. If any of the checksums don't match, a migration is needed. Plugins which exist in migrationState but are no longer in the live system are ignored. Their documents and mappings are retained in the index, so removing / disabling a plugin won't require a migration.

A migration is required if *any* one of the following statements is true:

- The index doesn't exist
- The index exists but has no migrationState
- The index exists but is not an alias
- The index exists, has a migrationState, the index's migrationState.status is 'migrated', but one or more of the active plugins' mappings / migrations are missing from it
- The `force` option is true and the index's migrationState.status is 'migrating'

Note: We don't store and compare a single checksum, because the migration system supports disabling and plugins without requiring a migration. If we were to use a single checksum of all plugins, then any change-- including disable / removal of a plugin-- requires a migration.


### Migrating an index

When a migration is attempted on an index, the first thing the migration index does is determine if migrations need to be run at all (using the rules outlined in the previous section). If the migration system determines that the index needs to be migrated, it performs (roughly) the following steps. Here, `index` is the name of the index being migrated.

- If `index` does not exist, it will be created
- If `index` is an index and not an alias, it will be converted to an alias
  - It will be reindexed to a name like `index-7.0.0-original`
  - `index` will be deleted
  - An alias `index` will be created, pointing to `index-7.0.0-original`
- The migration state document will be written to / updated to `index`, with status 'migrating'
- `index` will be made read-only
- A destination index will be created with a name like `index-7.0.0-SHAOFMIGRATIONSTATE`
  - `7.0.0` is whatever the current version of the Elasticstack is
  - `SHAOFMIGRATIONSTATE` ia a hash computed from the array of migrations and mappings being applied to the index
  - The destination index is created with mappings which include mappings defined by enabled *and* disabled / missing plugins
    - Disabled / removed plugin mappings are retained so that documents managed by those plugins are not lost during the migration process
- Seed migrations will be run
  - The resulting docs are passed through any subsequent transform migrations before being written to the destination index
- All documents from the original index will be run through the relevant transform migrations, then written to the destination index
  - This will only run transforms which are later than the ones already applied to the index
- The current `migrationState` will be written to the destination index
- The `index` alias will be pointed to the destination index

The migration engine does not delete indices, except in a handful of edge-cases. This means that migrations are non-destructive and can be manually rolled back if need be without loss of data.

The edge-cases where the migration index will delete an index are as follows:

- If the original index is not aliased, it will be converted to an alias via reindex (essentially a rename which makes a copy and deletes the original)
- If the destination index already exists, the migration system will assume it was created by a failed migration and will remove it prior to migrating the current index

The migrate function is accessed via: `Migration.migrate` exported by the `kbn-migrations` package.


### Importing data from file

If you want to import data from a file into an index, it's possible that the file contains documents that are older than the index and which need to be migrated before being written to the index.

To do this, the migration engine exposes functions that allow the migration state to be exported. When importing, the migration engine can be given a migration state and a list of documents. It will then run any necessary transform migrations on those documents to ensure they are up-to-date with the current index.

The tranform function is accessed via: `Document.transform` exported by the `kbn-migrations` package.


### Migration failures

Migrations can fail for a number of reasons

- One of the seeds / transforms throws an exception
- The index migrationState document has been tampered with and is invalid
- If any plugins in the index's migrationState are newer than the current, active plugins (e.g. if you try to run Kibana 6.4 against a Kibana 7.0 index)
- Connectivity errors between Kibana and Elasticsearch


## Adding migrations to a plugin

There is a yarn command to help plugin authors create new migrations:

```
yarn migration {new-seed | new-transform} {path_to_plugin_root_directory} {name_of_migration_file}
```

### Migration example

As an example, let's add some migrations to the core Kibana plugin.

Run `yarn migration new-seed ./src/core_plugins/kibana fancipants`, which will produce a file: `./src/core_plugins/kibana/migrations/{timestamp}_fancipants.js` as well as `./src/core_plugins/kibana/migrations/index.js`.

Update the seed file to look something like this:

```js
module.exports = {
  id: '20180430161212_seed_fancipants',
  seed() {
    return {
      id: 'fanci',
      type: 'pants',
      attributes: {
        description: 'Pinky in the air.',
      },
    };
  }
};
```

We also need to be sure to add `pants` to the plugin's mappings. In the case of the Kibana plugin, we need to update `./src/core_plugins/kibana/mappings.json`:

```json
{
  "pants": {
    "properties": {
      "description": {
        "type": "text"
      }
    }
  },
  // ... existing mappings omitted for brevity ...
}
```

Now, when we start Kibana, migrations will run, and we should see a new document with id `pants:fanci` created in the `.kibana` index (or whatever the configured Kibana index is).

Later in life, we may decide we want to add a new field to our `pants` documents, and we might want to ensure that all existing `pants` documents had a valid default for that field.

To do that, we'd create a transform:

`yarn migration new-transform ./src/core_plugins/kibana/ add_title_to_pants`

That would give us a file like: `./src/core_plugins/kibana/20180430161610_transform_add_title_to_pants.js`

```js
module.exports = {
  id: '20180430161610_transform_add_title_to_pants',

  // Only apply this migration to documents of type 'pants'
  filter: ({ type }) => 'pants',

  // We're going to add a title field to these docs, so we'll
  // give the existing docs a default value of 'N/A' for this field...
  transform(doc) {
    return {
      ...doc,
      attributes: {
        ...doc.attributes,
        title: 'Super Fanci',
      },
    };
  },
};
```

And again, we need a new mapping:

```json
{
  "pants": {
    "properties": {
      "description": {
        "type": "text"
      },
      "title": {
        "type": "text"
      },
    }
  }
}
```

When we restart Kibana, migrations will run, and we should see that any existing `pants` documents have the title we specified in our transform.



## Recovering from a failed migration

When running migrations, things can go wrong. If you're a plugin author and are just creating a new migration, maybe there's a bug in your migration and it throws an exception. Or maybe you're doing a production migration, and the Kibana server gets hit by lightning and dies.

Either way, what you end up with is a Kibana index that is partially migrated. In this case, Kibana will fail to start until the issue has been resolved and the migration is completed. The migration system stores some metadata about the migration state of the index, and in the case of a failed / partial migration, the index's migration state will have a status of `migrating`. By default, Kibana assumes that a status of `migrating` means that some other Kibana instance is currently performing the migration. But in the scenarios outlined above, that Kibana instance has died and is no longer running a migration.

You need to tell Kibana to ignore the index migration status and run migrations anyway. To do this, can start Kibana with a `--force-migration` option. You only ever want to start one instance of Kibana with this option. Starting several instances with this option will lead to migration errors and an unknown state (but which should nonetheless be recoverable by stopping all instances and running a single instance with the `--force-migration` option).



## Rolling back to a previous version of Kibana

The migration system is designed to be forward-only and doesn't support rollbacks. However, manually rolling the index back to a previous Kibana version is possible.

When migrations run, they create a brand new index, and (generally) leave the original index untouched. This means that in order to revert to a previous version of Kibana, all you have to do is:

- Point the `.kibana` alias to the original index
- Change the original index's migration status to be 'migrated'
- Ensure the original index is writable

This can be done via the Elasticsearch API. We'll use CURL in our examples, but any client should work. The value `.kibana` should be replaced with whatever your Kibana index name is configured to be: `.kibana` is the default.

First, we need to find out what the name of the current index is:

```
curl -X GET "localhost:9200/.kibana/_alias/*?pretty"
```

That gives us something that looks like this:

```json
{
  ".kibana-7.0.0-alpha1-e8c454203d8d4dbbc253fc5e28ae7ae36ec3c1a8" : {
    "aliases" : {
      ".kibana" : { }
    }
  }
}
```

Our current index name is: `.kibana-7.0.0-alpha1-e8c454203d8d4dbbc253fc5e28ae7ae36ec3c1a8`

Next, we need to find out what the previous index name was. The previous index name is stored in the current index's migration state, a document with ID: `migration:migration-state`.

```
curl -X GET "localhost:9200/.kibana/doc/migration:migration-state/_source?_source_include=migration.previousIndex&pretty"
```

Which gives us something like this:

```json
{
  "migration" : {
    "previousIndex" : ".kibana-6.4.0-d8c454203d8d4dbbc253fc5e28ae7ae36ec3c1a2"
  }
}
```

Now that we know the name of our current Kibana index and our previous one, we need to point the `.kibana` alias back to the original index:

```
curl -X POST "localhost:9200/_aliases" -H 'Content-Type: application/json' -d'
{
    "actions" : [
        { "add" : { "index" : ".kibana-6.4.0-d8c454203d8d4dbbc253fc5e28ae7ae36ec3c1a2", "alias" : ".kibana" } },
        { "remove" : { "index" : ".kibana-7.0.0-alpha1-e8c454203d8d4dbbc253fc5e28ae7ae36ec3c1a8", "alias" : ".kibana" } }
    ]
}
'
```

Put the previous index in the "add" action and the current index in the "remove" action.

Next, we need to ensure the previous index's migration status is 'migrated':

```
curl -X POST "localhost:9200/.kibana/doc/migration:migration-state/_update" -H 'Content-Type: application/json' -d'
{
  "script" : "ctx._source.migration.status = \"migrated\""
}
'
```

Finally, let's ensure that the Kibana index is writeable.

```
curl -X PUT "localhost:9200/.kibana/_settings" -H 'Content-Type: application/json' -d'
{
    "index" : {
        "blocks.read_only": "false"
    }
}
'
```

It should now be possible to start the previous version of Kibana.



## Design choices and constraints

- Not intended to be used to migrate large indices, as it pulls documents from Elasticsearch into Node and then back to Elasticsearch
- The index is assumed to only have documents which conform to the saved-object-client conventions
- Does not attempt to recover from failure of an individual migration
  - If an individual migration (transform or seed) fails, the migration fails
- Plugin ids are assumed to be stable. If a plugin's id changes, the migration system will:
  - Will think that it has been removed and a brand new plugin has been added
  - Will attempt to run all migrations for the "new" plugin
- Migration order is assumed to be stable within a plugin
  - So, the system will error in a scenario like this:
    - A plugin defines migrations 'a', 'b', and 'c'
    - Those migrations have been applied to an index
    - The plugin is upgraded to a later version, which defines migrations 'a', 'c', 'b'
    - In this case, the plugin's migrations have been reordered
- Migration state is cumulative (migration ids and plugin->mapping associations are never removed)
- Mappings are never removed
  - This is because we need to support old indices which might have mappings that are no longer associated with a plugin
  - We could put in logic to clean up mappings at the end of a migration:
    - During migration, track what mappings are required by existing docs
    - After migration, remove any mappings that are not defined by active plugins and that are not required by existing docs


## Kibana-index specific notes

Apart from the core migration logic in the `kbn-migrations` package, there is logic which is specific to the Kibana index itself.

When Kibana starts, it will check to see if it needs to migrate its index. If it does, it will perform the migration prior to serving any HTTP requests. Only one instance of Kibana will perform migrations at any given time. All other Kibana instances will wait for the migration to complete. This wait is done by polling the index at a configurable interval (defaults to 2 seconds, and is configurable via the `kibanamigrations.pollInterval` setting). Once the Kibana index migration has completed, the other instances will be able to start successfully.

If the Kibana instance that is performing the migration crashes or is killed prior to finishing the migration, all Kibana instances will be stuck in a polling loop, waiting for the migration to complete. There is no automatic recovery from this scenario, as such a mechanism seemed too complex and likely to introduce subtle bugs. Instead, one of the Kibana instances can be started with a `--force-migration` option which will make it run migrations even if the index has a `migrating` status.
