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
   7.11. Testing upgrades from 6.4 and 7.3 are particularly important.
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

### 2. Plugins enabled/disabled
Kibana plugins can be disabled/enabled at any point in time. We need to ensure
that Saved Object documents are migrated for all the possible sequences of
enabling, disabling, before or after a version upgrade.

#### Test scenario 1 (enable a plugin after migration):
1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
4. Upgrade Kibana to v7.11 making sure the plugin in step (3) is still disabled.
5. Enable the plugin from step (3)
6. Restart Kibana
7. Ensure that the document from step (2) has been migrated
   (`migrationVersion` contains 7.11.0)

#### Test scenario 2 (disable a plugin after migration):
1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Upgrade Kibana to v7.11 making sure the plugin in step (3) is enabled.
4. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
6. Restart Kibana
7. Ensure that Kibana logs a warning, but continues to start even though there
   are saved object documents which don't belong to an enable plugin

### Test scenario 2 (multiple instances, enable a plugin after migration):
Follow the steps from 'Test scenario 1', but perform the migration with
multiple instances of Kibana

### Test scenario 3 (multiple instances, mixed plugin enabled configs):
We don't support this upgrade scenario, but it's worth making sure we don't
have data loss when there's a user error.
1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
4. Upgrade Kibana to v7.11 using multiple instances of Kibana. The plugin from
   step (3) should be enabled on half of the instances and disabled on the
   other half.
5. Ensure that the document from step (2) has been migrated
   (`migrationVersion` contains 7.11.0)