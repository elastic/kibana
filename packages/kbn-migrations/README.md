# Migrations

A concern was raised with the previous approach to migrations: they would allow us to make breaking changes to our data between minor version changes. This might break customers who are consuming data from our Kibana index.

A new approach is outlined below, addressing this concern as well as a few others:


## General Overview

- Store Kibana version
  - Either as index metadata or on a per-document basis or both
  - The per-document approach would allow us to more easily detect edge-cases
    - If someone was writing docs from an old Kibana version while a new Kibana version was migrating the index
    - If someone somehow injects old docs into the index w/out going through the saved objects API
- Plugins can define migrations for types that they own
  - There is no co-ownership; a plugin owns its types and no one else does
  - Plugins can define one migration per type / version
  - If mappings change *or* Kibana version changes the docs in the index are migrated and re-saved
  - Indices are migrated in-place for minor version upgrades and are migrated to new indices for major version upgrades
  - Docs will be diffed and only written if they have actually changed
- When Kibana starts
  - If the index is newer than the current Kibana index
    - Log an error
    - Fail the boot process
    - Overridable via a `--downgrade` flag which allows downgrading within the same major version
    - The assumption here is that since changes between minor versions should be non-breaking, it's probably safe to downgrade, but the user should opt in explicitly
- Migrations between minor versions are not allowed to be breaking
  - Mapping properties / fields can be added, but not removed, and their types cannot change
  - Examples
    - If you need to move data out of a JSON blob and into a field, the migration needs to write to the JSON blob *and* the field
    - If you need to change a field from text to keyword, you need to create a new field, and keep the two in sync
- Ownership of a type can get moved from plugin to plugin by
  - Moving that type's migration function and mapping, and moving the type from one "ownership" list to the other
- The saved object client save / update operations will migrate docs as needed, based on the doc's version (or if not versioning per doc, based on an optional header in which the version is specified)
- In a clustered Kibana configuration, all Kibana instances can run migrations simultaneously, as there is no real downside other than unecessary writes


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


## Minor Versions

If Kibana detects that it needs to do a minor-version migration:

- It will diff the current mappings w/ the mappings defined in the index
  - If the mapping changes are additive, transform
  - If the mapping changes are destructive, reject
  - If a mapping is plain missing, it's ok, as it probably means a plugin is disabled


## Major Versions

If Kibana detects that it needs to do a major-version migration:

- We don't support disabling plugins, doing the migration, then slowly enabling plugins in a staged rollout
  - We will drop data for any disabled plugins during major upgrades
  - For this reason, we'll show an upgrade assistant (show screen before migrating detailing potential data losses)
- It will create a new index w/ up-to-date mappings
- Migrate all docs from the old index to the new
  - Drop any docs whose plugins are missing / disabled (after prompting the user in some way)
- Point the alias to the new index
- Plugins that are making breaking changes simply need to:
  - Update their mappings to look however they want
  - Write a `7.0.0` (or whatever major version) migration to reshape the pre-7.0.0 doc to conform to the new mappings
  
