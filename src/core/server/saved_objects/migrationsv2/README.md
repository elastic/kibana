## TODO
 - [ ] Should we adopt the naming convention of event log `.kibana-event-log-8.0.0-000001`?

## Manual QA Test Plan
### 1. Legacy pre-migration
When upgrading from a legacy index additional steps are required before the
regular migration process can start.

We have the following potential legacy indices:
 - < v6.5 `.kibana` _index_ (Saved Object Migrations were
   introduced in v6.5 https://github.com/elastic/kibana/pull/20243)
 - < v7.4 `.kibana_task_manager` _index_ (Task Manager started
   using Saved Objects in v7.4 https://github.com/elastic/kibana/pull/39829)

Test plan:
1. Ensure that all Kibana minors >= 6.0 and <= 7.4 can successfully upgrade to
   7.11
2. Ensure that multiple Kibana nodes can migrate a legacy index in parallel
   (choose a representative legacy version to test with e.g. v6.4). Add a lot
   of Saved Objects to Kibana to increase the time it takes for a migration to
   complete which will make it easier to introduce failures.
   1. If all instances are started in parallel the upgrade should succeed
   2. If nodes are randomly restarted shortly after they start participating
      in the migration the upgrade should either succeed or never complete.
      However, if a fatal error occurs it should never result in permanent
      failure.
        1. Start one instance, wait 500 ms
        2. Start a second instance
        3. If an instance starts a saved object migration, wait X ms before
           killing the process and restarting the migration.
        4. Keep decreasing X until migrations are barely able to complete.
        5. If a migration fails with a fatal error, start a Kibana that doesn't
           get restarted. Given enough time, it should always be able to
           successfully complete the migration.

For a successful migration the following behaviour should be observed: 
 1. The `.kibana` index should be reindexed into a `.kibana_pre6.5.0` index
 2. The `.kibana` index should be deleted
 3. The `.kibana_pre6.5.0` index should have a write block applied
 4. Documents from `.kibana_pre6.5.0` should be migrated into `.kibana_7.11.0_001`
 5. Once migration has completed, the `.kibana_current` and `.kibana_7.11.0`
    aliases should point to the `.kibana_7.11.0_001` index.

