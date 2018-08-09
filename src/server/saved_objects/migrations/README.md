# Migrations

This is the system that manages the versioning of saved object indices. It manages changes to the index, including mappings, index templates, and changes to the shape of documents from one version of Kibana to another.

## Outstanding questions

- Should we migrate all docs in the index between minor versions?
  - @epixa does not want to migrate the index on minor versions
  - @clintongormley [seems to think we should](https://github.com/elastic/kibana/issues/15100#issuecomment-398041512)

- How should we disallow breaking changes to data between minor versions?
  - Via a policy "don't do it, but migrations will allow it, if there truly is a need"
  - Programatically by comparing the index mappings with those of the Kibana system and erroring if a breaking change is detected
  - Programatically by not migrating the index between minor versions (e.g. a combination of the previous point and Elastic's own rules for changes to mappings)

- If we don't migrate on minor versions:
  - How do we perform a transform on a find operation (which allows for a subset of document fields to be queried?)
    - @tylersmalley suggested querying the full docs during find operations, transforming them, then doing the source filter ourselves
    - I recommend just migrating the index on minor version upgrades, if need be
  - We we can't reliably use new fields for search / aggregations, etc until the next major version


## Current strategy

- A separate migration strategy for minor versions and major versions
  - Major versions
    - Will migrate the index
    - Will transform docs at migration time as well as on saved object reads / writes
    - Will allow breaking mapping changes
    - Will show a UI and expose an API for kicking off migrations (see below for more details)
  - Minor versions
    - Will not migrate the index
    - Will transform docs on all saved object reads / writes
    - Will not allow breaking changes to mappings
      - Migration system will diff the current mappings w/ the mappings defined in the index
      - Allow additive mapping changes
      - Allow a root mapping to be in the index, but not in the current system, it means a plugin is enabled
      - Disallow destructive mapping changes
      - Disallow changes to mapping types (e.g. disallow text -> keyword)
- Migrations are a function of type -> semver -> transformFunction
  - Until 7.x, we can't force calling code to send us the Kibana version, as that is a breaking change
  - It's unrealistic (and arguably unsecure) to ever expect all callers to accurately send us migration version info like `{fooPlugin: '2.3.5', barPlugin: '9.3.1'}` for each doc
  - So, we will have a single transform function per type + major version
  - Each transform must be robust enough to handle docs of any shape ever supported by its major version
  - Docs will be run through the appropriate transform(s) when the index is migrated *and* when the saved object client does a write
  - Even though there is only one transform per type + major version, transforms are exposed via a semver, so we can require a migration if a transform changes
  - We disallow defining multiple transforms for a single type within a major verison (e.g. it is an error to define a separate transform for `foo:1.2, foo:1.3`)
- The Kibana version will be stored in the index
  - Used to distinguish between major vs minor upgrade
- Plugins can define migrations for types that they own
  - There is no co-ownership; a plugin owns its types and no one else does
  - Plugins can define one migration per type / major version
  - Ownership of a type can get moved from plugin to plugin by
    - Moving that type's migration functions and mapping from one plugin to another
- Document transform functions need to be robust enough to handle any documents that were ever valid for the current major version
  - Examples
    - If you need to move data out of a JSON blob and into a field, the migration needs to write to the JSON blob *and* the field
    - If you need to change a field from text to keyword, you need to create a new field, and keep the two in sync (easier said than done)
- The saved object client save / update operations will migrate docs as needed, based on the doc's version (or if not versioning per doc, based on an optional header in which the version is specified)
- For major verison upgrades,
  - We will drop data for any disabled plugins during major upgrades
  - For this reason, we'll show an upgrade assistant UI (show screen before migrating detailing potential data losses)
    - Shows a "Migrate" button (text TBD)
    - Shows what will happen if that button is clicked (e.g. 30 'foo' docs will be dropped, as there are no 'foo' plugins enabled)
    - Calls an API, runs as current user if x-pack is enabled?
    - Runs index migration as a background task? (Might need to do this after the scheduled task work is done, but should run at most once per Kibana instance)
    - UI can do something like poll some endpoint to see if migration is complete, allows re-starting things if the migration stalls / fails
  - A new index will be created `.kibana-{VERSION}-{SHA_OF_PLUGINS}`
    - The sha is there so that if multiple Kibana instances attempt a migration, they do so predictively and can be coordinated if need be
  - Only active mappings will be written to the index
  - Docs will be read from the old index, transformed, and written to the new index (or dropped, if unsupported)
  - The `.kibana` alias (or whatever it's configured to be) will be pointed to the new index
  - Plugins that are making breaking changes simply need to:
    - Update their mappings to look however they want
    - Update the `{VERSION-1}` transform to return a `{VERSION}` doc
  - Types can be renamed by creating a transform for (e.g. `foo` that returns a document of type `bar`)
    - The `bar` document will then be run through the appropriate transforms
  - If migrations fail part-way through, the system does not do cleanup, so, there may be unexpected indices lying around
- Exports store the major version of Kibana that generated the export so that we know what migrations to run during import
- Imports send the major version of Kibana that generated them, defaulting to 6.0 or some reasonable default for old, unversioned imports 
- In 7.x Kibana version can be required to be sent with all API calls (if we think it's worthwhile)
  - Any unversioned docs can be assumed to be 6.x- and are passed through any relevant 6.x- transforms, then 7.x, etc to get up to date

### A simple example of how migrations might be defined by a plugin

```js
{
  migrations: {
    dashboard: {
      'v6.5.0': (doc) => extractSomethingFromJsonToANewField(doc),
      'v7.0.0': (doc) => dropDeprecatedFields(doc),
    },
  },
}
```


## Alternative strategy

We *could* migrate the index even between minor versions. We could still disallow breaking changes on minor upgrades, and we'd still retain docs for disabled plugins during minor upgrades.

Here's what would change if we decided to do this:

- The Kibana index will be migrated any time a migration is determined to be necessary
- Migration is determined to be necessary if there are plugins with migrations newer than those applied to the index
- Non-breaking mapping changes do not necessitate a migration, but simply a patch of the index mappings / index template
- New fields added during a minor version upgrade would be immediately searchable, aggregatable, etc
- Store simple migration version info either at the index level or on a per-document basis
  - Migration version is an array or map of `plugin -> semver`
  - If stored on the index, it's a simple determination to check if the index is migrated
  - If per-doc, we can do a max aggregation query to determine if the index is up to date
- If a plugin is disabled, we have to do one of two things:
  - Reject writes to any docs that belong to it; otherwise, we may get invalid docs in our index
  - Or, we can store these docs and simply run a migration when a plugin is enabled and has any migrations defined, even if the index seems up to date
- On startup, if the index is out of date, show the migration UI (in the current strategy, this is only shown for major version upgrades)
