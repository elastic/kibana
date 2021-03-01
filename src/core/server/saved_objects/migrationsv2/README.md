- [Introduction](#introduction)
- [Algorithm](#algorithm)
  - [INIT](#init)
    - [Next action](#next-action)
    - [New control state](#new-control-state)
  - [CREATE_NEW_TARGET](#create_new_target)
    - [Next action](#next-action-1)
    - [New control state](#new-control-state-1)
  - [LEGACY_SET_WRITE_BLOCK](#legacy_set_write_block)
    - [Next action](#next-action-2)
    - [New control state](#new-control-state-2)
  - [SET_SOURCE_WRITE_BLOCK](#set_source_write_block)
    - [Next action](#next-action-3)
    - [New control state](#new-control-state-3)
  - [CREATE_REINDEX_TEMP](#create_reindex_temp)
    - [Next action](#next-action-4)
    - [New control state](#new-control-state-4)
  - [REINDEX_SOURCE_TO_TEMP_OPEN_PIT](#reindex_source_to_temp_open_pit)
    - [Next action](#next-action-5)
    - [New control state](#new-control-state-5)
  - [REINDEX_SOURCE_TO_TEMP_READ](#reindex_source_to_temp_read)
    - [Next action](#next-action-6)
    - [New control state](#new-control-state-6)
  - [REINDEX_SOURCE_TO_TEMP_INDEX](#reindex_source_to_temp_index)
    - [Next action](#next-action-7)
    - [New control state](#new-control-state-7)
  - [REINDEX_SOURCE_TO_TEMP_CLOSE_PIT](#reindex_source_to_temp_close_pit)
    - [Next action](#next-action-8)
    - [New control state](#new-control-state-8)
  - [SET_TEMP_WRITE_BLOCK](#set_temp_write_block)
    - [Next action](#next-action-9)
    - [New control state](#new-control-state-9)
  - [CLONE_TEMP_TO_TARGET](#clone_temp_to_target)
    - [Next action](#next-action-10)
    - [New control state](#new-control-state-10)
  - [OUTDATED_DOCUMENTS_SEARCH](#outdated_documents_search)
    - [Next action](#next-action-11)
    - [New control state](#new-control-state-11)
  - [OUTDATED_DOCUMENTS_TRANSFORM](#outdated_documents_transform)
    - [Next action](#next-action-12)
    - [New control state](#new-control-state-12)
  - [UPDATE_TARGET_MAPPINGS](#update_target_mappings)
    - [Next action](#next-action-13)
    - [New control state](#new-control-state-13)
  - [UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK](#update_target_mappings_wait_for_task)
    - [Next action](#next-action-14)
    - [New control state](#new-control-state-14)
  - [MARK_VERSION_INDEX_READY_CONFLICT](#mark_version_index_ready_conflict)
    - [Next action](#next-action-15)
    - [New control state](#new-control-state-15)
- [Manual QA Test Plan](#manual-qa-test-plan)
  - [1. Legacy pre-migration](#1-legacy-pre-migration)
  - [2. Plugins enabled/disabled](#2-plugins-enableddisabled)
    - [Test scenario 1 (enable a plugin after migration):](#test-scenario-1-enable-a-plugin-after-migration)
    - [Test scenario 2 (disable a plugin after migration):](#test-scenario-2-disable-a-plugin-after-migration)
    - [Test scenario 3 (multiple instances, enable a plugin after migration):](#test-scenario-3-multiple-instances-enable-a-plugin-after-migration)
    - [Test scenario 4 (multiple instances, mixed plugin enabled configs):](#test-scenario-4-multiple-instances-mixed-plugin-enabled-configs)

# Introduction
In the past, the risk of downtime caused by Kibana's saved object upgrade
migrations have discouraged users from adopting the latest features. v2
migrations aims to solve this problem by minimizing the operational impact on
our users.

To achieve this it uses a new migration algorithm where every step of the
algorithm is idempotent. No matter at which step a Kibana instance gets
interrupted, it can always restart the migration from the beginning and repeat
all the steps without requiring any user intervention. This doesn't mean
migrations will never fail, but when they fail for intermittent reasons like
an Elasticsearch cluster running out of heap, Kibana will automatically be
able to successfully complete the migration once the cluster has enough heap.

For more background information on the problem see the [saved object
migrations
RFC](https://github.com/elastic/kibana/blob/master/rfcs/text/0013_saved_object_migrations.md).

# Algorithm

## INIT
### Next action
`fetchIndices`

Fetch the saved object indices, mappings and aliases to find the source index
and determine whether we’re migrating from a legacy index or a v1 migrations
index.

### New control state
1. If `.kibana` and the version specific aliases both exists and are pointing
to the same index. This version's migration has already been completed. Since
the same version could have plugins enabled at any time that would introduce
new transforms or mappings.
  →  `OUTDATED_DOCUMENTS_SEARCH`

2. If `.kibana` is pointing to an index that belongs to a later version of
Kibana .e.g. a 7.11.0 instance found the `.kibana` alias pointing to
`.kibana_7.12.0_001` fail the migration
  → `FATAL`

3. If the `.kibana` alias exists we’re migrating from either a v1 or v2 index
and the migration source index is the index the `.kibana` alias points to.
  → `SET_SOURCE_WRITE_BLOCK`

4. If `.kibana` is a concrete index, we’re migrating from a legacy index
  → `LEGACY_SET_WRITE_BLOCK`

5. If there are no `.kibana` indices initialize a new saved objects indices
  → `CREATE_NEW_TARGET`

## CREATE_NEW_TARGET
### Next action
`createIndex`

Create the target index. This operation is idempotent, if the index already exist, we wait until its status turns yellow

### New control state
 → `MARK_VERSION_INDEX_READY`

## LEGACY_SET_WRITE_BLOCK
### Next action
`setWriteBlock`

Set a write block on the legacy index to prevent any older Kibana instances from writing to the index while the migration is in progress which could cause lost acknowledged writes.

### New control state
1. If the write block was successfully added
 → `LEGACY_CREATE_REINDEX_TARGET`
2. If the write block failed because the index doesn't exist, it means another instance already completed the legacy pre-migration. Proceed to the next step.
  → `LEGACY_CREATE_REINDEX_TARGET`

## SET_SOURCE_WRITE_BLOCK
### Next action
`setWriteBlock`

Set a write block on the source index to prevent any older Kibana instances from writing to the index while the migration is in progress which could cause lost acknowledged writes.

### New control state
  → `CREATE_REINDEX_TEMP`

## CREATE_REINDEX_TEMP
### Next action
`createIndex`

This operation is idempotent, if the index already exist, we wait until its status turns yellow. 

- Because we will be transforming documents before writing them into this index, we can already set the mappings to the target mappings for this version. The source index might contain documents belonging to a disabled plugin. So set `dynamic: false` mappings for any unknown saved object types.
- (optionally disable refresh to speed up indexing performance ?)

### New control state
  → `REINDEX_SOURCE_TO_TEMP_OPEN_PIT`

## REINDEX_SOURCE_TO_TEMP_OPEN_PIT
### Next action
`openPIT`

Open a PIT. Since there is a write block on the source index there is basically no overhead to keeping the PIT so we can lean towards a larger `keep_alive` value like 10 minutes.
### New control state
  → `REINDEX_SOURCE_TO_TEMP_READ`

## REINDEX_SOURCE_TO_TEMP_READ
### Next action
`readNextBatchOfSourceDocuments`

Read the next batch of outdated documents from the source index by using search after with our PIT.

### New control state
1. If the batch contained > 0 documents
  → `REINDEX_SOURCE_TO_TEMP_INDEX`
2. If there are no more documents returned
  → `REINDEX_SOURCE_TO_TEMP_CLOSE_PIT`

## REINDEX_SOURCE_TO_TEMP_INDEX
### Next action
`transformRawDocs` + `bulkIndexTransformedDocuments`

1. Transform the current batch of documents
2. Use the bulk API create action to write a batch of up-to-date documents. The create action ensures that there will be only one write per reindexed document even if multiple Kibana instances are performing this step. Use `wait_for=false` to speed up the create actions. Ignore any create errors because of documents that already exist in the temporary index.
### New control state
  → `REINDEX_SOURCE_TO_TEMP_READ`
   
## REINDEX_SOURCE_TO_TEMP_CLOSE_PIT
### Next action
`closePIT`

### New control state
  → `SET_TEMP_WRITE_BLOCK`

## SET_TEMP_WRITE_BLOCK
### Next action
`setWriteBlock`

Set a write block on the temporary index so that we can clone it.
### New control state
  → `CLONE_TEMP_TO_TARGET`
  
## CLONE_TEMP_TO_TARGET
### Next action
`cloneIndex`

Ask elasticsearch to clone the temporary index into the target index. If the target index already exists (because another node already started the clone operation), wait until the clone is complete by waiting for a yellow index status.

We can’t use the temporary index as our target index because one instance can complete the migration, delete a document, and then a second instance starts the reindex operation and re-creates the deleted document. By cloning the temporary index and only accepting writes/deletes from the cloned target index, we prevent lost acknowledged deletes.

### New control state
If another instance has some plugins disabled it will reindex that plugin's documents without transforming them. Search for outdated documents to ensure that everything is up to date.
  → `OUTDATED_DOCUMENTS_SEARCH`

## OUTDATED_DOCUMENTS_SEARCH
### Next action
`searchForOutdatedDocuments`

Search for outdated saved object documents. Will return one batch of documents.

### New control state
1. Found outdated documents?
  → `OUTDATED_DOCUMENTS_TRANSFORM`
2. All documents up to date
  → `UPDATE_TARGET_MAPPINGS`

## OUTDATED_DOCUMENTS_TRANSFORM
### Next action
`transformRawDocs` + `bulkOverwriteTransformedDocuments`

Once transformed we use an index operation to overwrite the outdated document with the up-to-date version. Optimistic concurrency control ensures that we only overwrite the document once so that any updates/writes by another instance which already completed the migration aren’t overwritten and lost.

### New control state
  → `OUTDATED_DOCUMENTS_SEARCH`

## UPDATE_TARGET_MAPPINGS
### Next action
`updateAndPickupMappings`

If another instance has some plugins disabled it will disable the mappings of that plugin's types when creating the temporary index. This action will
update the mappings and then use an update_by_query to ensure that all fields are “picked-up” and ready to be searched over.

### New control state
  → `UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK`

## UPDATE_TARGET_MAPPINGS_WAIT_FOR_TASK
### Next action
`updateAliases`

Atomically apply the `versionIndexReadyActions` using the _alias actions API. By performing the following actions we guarantee that if multiple versions of Kibana started the upgrade in parallel, only one version will succeed.

1. verify that the current alias is still pointing to the source index
2. Point the version alias and the current alias to the target index.
3. Remove the temporary index

### New control state
1. If all the actions succeed we’re ready to serve traffic
  → DONE
2. If action (1) fails with alias_not_found_exception or action (3) fails with index_not_found_exception another instance already completed the migration
  → MARK_VERSION_INDEX_READY_CONFLICT

## MARK_VERSION_INDEX_READY_CONFLICT
### Next action
`fetchIndices`

Fetch the saved object indices

### New control state
If another instance completed a migration from the same source we need to verify that it is running the same version.

1. If the current and version aliases are pointing to the same index the instance that completed the migration was on the same version and it’s safe to start serving traffic.
  → DONE
2. If the other instance was running a different version we fail the migration. Once we restart one of two things can happen: the other instance is an older version and we will restart the migration, or, it’s a newer version and we will refuse to start up.
  → FATAL

# Manual QA Test Plan
## 1. Legacy pre-migration
When upgrading from a legacy index additional steps are required before the
regular migration process can start.

We have the following potential legacy indices:
 - v5.x index that wasn't upgraded -> kibana should refuse to start the migration
 - v5.x index that was upgraded to v6.x: `.kibana-6` _index_ with `.kibana` _alias_
 - < v6.5 `.kibana` _index_ (Saved Object Migrations were
   introduced in v6.5 https://github.com/elastic/kibana/pull/20243)
 - TODO: Test versions which introduced the `kibana_index_template` template?
 - < v7.4 `.kibana_task_manager` _index_ (Task Manager started
   using Saved Objects in v7.4 https://github.com/elastic/kibana/pull/39829)

Test plan:
1. Ensure that the different versions of Kibana listed above can successfully
   upgrade to 7.11.
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
 3. The `.kibana_index_template` should be deleted
 4. The `.kibana_pre6.5.0` index should have a write block applied
 5. Documents from `.kibana_pre6.5.0` should be migrated into `.kibana_7.11.0_001`
 6. Once migration has completed, the `.kibana_current` and `.kibana_7.11.0`
    aliases should point to the `.kibana_7.11.0_001` index.

## 2. Plugins enabled/disabled
Kibana plugins can be disabled/enabled at any point in time. We need to ensure
that Saved Object documents are migrated for all the possible sequences of
enabling, disabling, before or after a version upgrade.

### Test scenario 1 (enable a plugin after migration):
1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
4. Upgrade Kibana to v7.11 making sure the plugin in step (3) is still disabled.
5. Enable the plugin from step (3)
6. Restart Kibana
7. Ensure that the document from step (2) has been migrated
   (`migrationVersion` contains 7.11.0)

### Test scenario 2 (disable a plugin after migration):
1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Upgrade Kibana to v7.11 making sure the plugin in step (3) is enabled.
4. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
6. Restart Kibana
7. Ensure that Kibana logs a warning, but continues to start even though there
   are saved object documents which don't belong to an enable plugin

### Test scenario 3 (multiple instances, enable a plugin after migration):
Follow the steps from 'Test scenario 1', but perform the migration with
multiple instances of Kibana

### Test scenario 4 (multiple instances, mixed plugin enabled configs):
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

