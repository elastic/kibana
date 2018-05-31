# Migrations

## Minor Version Transform

Several PRs:

- Track Kibana version in index metadata
- Move mapping building logic out into a standalone feature that can be consumed variously by migrations and saved object client, etc
- Put in logic to diff the current mappings w/ the mappings defined in the index
  - If the mapping changes are additive, transform
  - If the mapping changes are destructive, and this isn't a major version upgrade, reject
  - If a mapping is plain missing, it's ok, as it probably means a plugin is disabled
- Saved Object: transform prior to create / update
- Startup: upgrade docs in the index if additive mappings are detected


Architecture

- Kibana version is stored in index metadata
  - If Kibana starts and finds that the Kibana index is newer than the Kibana version
    - It will fail to start
    - Users can force it to start, in which case, it will mark the Kibana index as being its own version (provided it is the same major version as the index)
    - The assumption here is that since changes between minor versions are non-breaking, it's probably safe to downgrade, but the user should opt in explicitly
- Plugins define a list of types that they own
  - This is in addition to defining mappings, as ultimately, plugins may remove a mapping, but still need to be able to upgrade old docs
  - There is no co-ownership; a plugin owns its types and no one else does
- Plugins can define transforms for types that they own
  - If mappings change *or* Kibana version changes the docs in the index are transformed and re-saved
  - Docs will be diffed and only written if they have actually changed
  - A plugin will have only one transform function per type / major Kibana version
- A transform function must accept documents of any shape supported by the major version it pertains to (e.g. 6.0, 6.1, 6.2, etc)
- Transforms between minor versions are not allowed to be breaking
  - Fields can be added, but not removed, nor mappings changed
  - If you need to (e.g. move data out of a JSON blob and into a field, the transform needs to write to the JSON blob *and* the field)
- Ownership of a type can get moved from plugin to plugin by
  - Moving that type's transform function and mapping, and moving the type from one "ownership" list to the other
- Transforms are run on all docs prior to any saved object client save / update operations
- In a clustered Kibana configuration, all Kibana instances can run migrations simultaneously, as there is no real downside other than unecessary writes


Pseudo

Plugins might define their migrations in a shape that looks something like this:

```js

{
  id: 'myplugin',
  migration: {
    v6: {
      mytype: {
        transform: (doc) => doc,
      },
    },
    v5: {
      mytype: {
        transform: (doc) => doc,
      },
    },
  },
}
```


## Major Version Upgrade

WIP. Some (rough) notes:

- We don't support disabling plugins, doing the migration, then slowly enabling plugins in a staged rollout
  - We will drop data for any disabled plugins during major upgrades
  - For this reason, we'll show an upgrade assistant (show screen before migrating detailing potential data losses)
- Plugins can make breaking changes to mappings / docs when a major version is released
- To do this, they just need to define the new mappings and provide an upgrade function for the affected types
  - The upgrade function takes a doc which is guaranteed to be of the shape(V-1), transforms it into shape(V)
- When Kibana boots:
  - Checks to see if `.kibana` is an alias and that it points to `.kibana-{MAJOR_VERSION}`
  - If this is true, it's already upgraded, only minor version transform logic is applied
  - If this is false, it needs to be upgraded
    - Ensures `.kibana` is an alias
    - Scans all docs from the old index
    - Runs them through the previous version's transform functions
    - Runs them through the appropriate upgrade functions
    - Runs them through the current version's transform functions
    - Persists them to the new index
    - Points the `.kibana` alias to the new index
  - Again, this process can be done by any number of Kibana instances, as it is predictive


When we do major version upgrades, plugins can add an upgrade function to their migrations:

```js
{
  id: 'myplugin',
  migration: {
    v6: {
      mytype: {
        transform: (doc) => doc,
        // Upgrade doc from 5.x -> 6.0
        upgrade: (doc) => doc,
      }
    },
    v5: {
      mytype: {
        transform: (doc) => doc,
        // Upgrade doc from 4.x -> 5.0
        upgrade: (doc) => doc,
      }
    },
  },
}
```


  
