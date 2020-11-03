## TODO
 - [ ] Should we adopt the naming convention of event log `.kibana-event-log-8.0.0-000001`?

## Manual QA Test Plan
### 1. REINDEX_LEGACY_SOURCE
Test migrations from a concrete index for the following cases:
1. Migrate from a < v6.5 `.kibana` _index_ (Saved Object Migrations were
   introduced in v6.5 https://github.com/elastic/kibana/pull/20243)
2. Migrate from a < v7.4 `.kibana_task_manager` _index_ (Task Manager started
   using Saved Objects in v7.4 https://github.com/elastic/kibana/pull/39829)
3. Multiple nodes migrating a legacy index at the same time

For each case the following behaviour should be observed: 
 1. The `.kibana` index should be reindexed into a `.kibana_pre6.5.0` index
 2. The `.kibana` index should be deleted
 3. A new `.kibana` alias should be created pointing to the `.kibana_pre6.5.0` index
 4. The `.kibana_pre6.5.0` index should have a write block applied
 5. Documents from `.kibana_pre6.5.0` should be migrated into `.kibana_7.11.0_001`
 6. Once migration has completed, the `.kibana_current`, `.kibana` and `.kibana_7.11.0` aliases should all
    point to the `.kibana_7.11.0_001` index

