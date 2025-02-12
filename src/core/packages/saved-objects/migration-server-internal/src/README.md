<!-- markdownlint-disable MD024 MD041 -->
- [Introduction](#introduction)
- [Algorithm steps](#algorithm-steps)
  - [INIT](#init)
    - [Next action](#next-action)
    - [New control state](#new-control-state)
  - [CREATE\_NEW\_TARGET](#create_new_target)
    - [Next action](#next-action-1)
    - [New control state](#new-control-state-1)
  - [LEGACY\_CHECK\_CLUSTER\_ROUTING\_ALLOCATION](#legacy_check_cluster_routing_allocation)
    - [Next action](#next-action-2)
    - [New control state](#new-control-state-2)
  - [LEGACY\_SET\_WRITE\_BLOCK](#legacy_set_write_block)
    - [Next action](#next-action-3)
    - [New control state](#new-control-state-3)
  - [LEGACY\_CREATE\_REINDEX\_TARGET](#legacy_create_reindex_target)
    - [Next action](#next-action-4)
    - [New control state](#new-control-state-4)
  - [LEGACY\_REINDEX](#legacy_reindex)
    - [Next action](#next-action-5)
    - [New control state](#new-control-state-5)
  - [LEGACY\_REINDEX\_WAIT\_FOR\_TASK](#legacy_reindex_wait_for_task)
    - [Next action](#next-action-6)
    - [New control state](#new-control-state-6)
  - [LEGACY\_DELETE](#legacy_delete)
    - [Next action](#next-action-7)
    - [New control state](#new-control-state-7)
  - [WAIT\_FOR\_MIGRATION\_COMPLETION](#wait_for_migration_completion)
    - [Next action](#next-action-8)
    - [New control state](#new-control-state-8)
  - [WAIT\_FOR\_YELLOW\_SOURCE](#wait_for_yellow_source)
    - [Next action](#next-action-9)
    - [New control state](#new-control-state-9)
  - [UPDATE\_SOURCE\_MAPPINGS\_PROPERTIES](#update_source_mappings_properties)
    - [Next action](#next-action-10)
    - [New control state](#new-control-state-10)
  - [CLEANUP\_UNKNOWN\_AND\_EXCLUDED](#cleanup_unknown_and_excluded)
    - [Next action](#next-action-11)
    - [New control state](#new-control-state-11)
  - [CLEANUP\_UNKNOWN\_AND\_EXCLUDED\_WAIT\_FOR\_TASK](#cleanup_unknown_and_excluded_wait_for_task)
    - [Next action](#next-action-12)
    - [New control state](#new-control-state-12)
  - [PREPARE\_COMPATIBLE\_MIGRATION](#prepare_compatible_migration)
    - [Next action](#next-action-13)
    - [New control state](#new-control-state-13)
  - [REFRESH\_SOURCE](#refresh_source)
    - [Next action](#next-action-14)
    - [New control state](#new-control-state-14)
  - [CHECK\_CLUSTER\_ROUTING\_ALLOCATION](#check_cluster_routing_allocation)
    - [Next action](#next-action-15)
    - [New control state](#new-control-state-15)
  - [CHECK\_UNKNOWN\_DOCUMENTS](#check_unknown_documents)
    - [Next action](#next-action-16)
  - [SET\_SOURCE\_WRITE\_BLOCK](#set_source_write_block)
    - [Next action](#next-action-17)
    - [New control state](#new-control-state-16)
  - [CREATE\_REINDEX\_TEMP](#create_reindex_temp)
    - [Next action](#next-action-18)
    - [New control state](#new-control-state-17)
  - [REINDEX\_SOURCE\_TO\_TEMP\_OPEN\_PIT](#reindex_source_to_temp_open_pit)
    - [Next action](#next-action-19)
    - [New control state](#new-control-state-18)
  - [REINDEX\_SOURCE\_TO\_TEMP\_READ](#reindex_source_to_temp_read)
    - [Next action](#next-action-20)
    - [New control state](#new-control-state-19)
  - [REINDEX\_SOURCE\_TO\_TEMP\_TRANSFORM](#reindex_source_to_temp_transform)
    - [Next action](#next-action-21)
    - [New control state](#new-control-state-20)
  - [REINDEX\_SOURCE\_TO\_TEMP\_INDEX\_BULK](#reindex_source_to_temp_index_bulk)
    - [Next action](#next-action-22)
    - [New control state](#new-control-state-21)
  - [REINDEX\_SOURCE\_TO\_TEMP\_CLOSE\_PIT](#reindex_source_to_temp_close_pit)
    - [Next action](#next-action-23)
    - [New control state](#new-control-state-22)
  - [SET\_TEMP\_WRITE\_BLOCK](#set_temp_write_block)
    - [Next action](#next-action-24)
    - [New control state](#new-control-state-23)
  - [CLONE\_TEMP\_TO\_TARGET](#clone_temp_to_target)
    - [Next action](#next-action-25)
    - [New control state](#new-control-state-24)
  - [REFRESH\_TARGET](#refresh_target)
    - [Next action](#next-action-26)
    - [New control state](#new-control-state-25)
  - [OUTDATED\_DOCUMENTS\_SEARCH\_OPEN\_PIT](#outdated_documents_search_open_pit)
    - [Next action](#next-action-27)
    - [New control state](#new-control-state-26)
  - [OUTDATED\_DOCUMENTS\_SEARCH\_READ](#outdated_documents_search_read)
    - [Next action](#next-action-28)
    - [New control state](#new-control-state-27)
  - [OUTDATED\_DOCUMENTS\_TRANSFORM](#outdated_documents_transform)
    - [Next action](#next-action-29)
    - [New control state](#new-control-state-28)
  - [TRANSFORMED\_DOCUMENTS\_BULK\_INDEX](#transformed_documents_bulk_index)
    - [Next action](#next-action-30)
    - [New control state](#new-control-state-29)
  - [OUTDATED\_DOCUMENTS\_SEARCH\_CLOSE\_PIT](#outdated_documents_search_close_pit)
    - [Next action](#next-action-31)
    - [New control state](#new-control-state-30)
  - [OUTDATED\_DOCUMENTS\_REFRESH](#outdated_documents_refresh)
    - [Next action](#next-action-32)
    - [New control state](#new-control-state-31)
  - [CHECK\_TARGET\_MAPPINGS](#check_target_mappings)
    - [Next action](#next-action-33)
    - [New control state](#new-control-state-32)
  - [UPDATE\_TARGET\_MAPPINGS\_PROPERTIES](#update_target_mappings_properties)
    - [Next action](#next-action-34)
    - [New control state](#new-control-state-33)
  - [UPDATE\_TARGET\_MAPPINGS\_PROPERTIES\_WAIT\_FOR\_TASK](#update_target_mappings_properties_wait_for_task)
    - [Next action](#next-action-35)
    - [New control state](#new-control-state-34)
  - [CHECK\_VERSION\_INDEX\_READY\_ACTIONS](#check_version_index_ready_actions)
    - [Next action](#next-action-36)
    - [New control state](#new-control-state-35)
  - [MARK\_VERSION\_INDEX\_READY](#mark_version_index_ready)
    - [Next action](#next-action-37)
    - [New control state](#new-control-state-36)
  - [MARK\_VERSION\_INDEX\_READY\_CONFLICT](#mark_version_index_ready_conflict)
    - [Next action](#next-action-38)
    - [New control state](#new-control-state-37)
  - [FATAL](#fatal)
  - [DONE](#done)
- [Manual QA Test Plan](#manual-qa-test-plan)
  - [1. Legacy pre-migration](#1-legacy-pre-migration)
  - [2. Plugins enabled/disabled](#2-plugins-enableddisabled)
    - [Test scenario 1 (enable a plugin after migration)](#test-scenario-1-enable-a-plugin-after-migration)
    - [Test scenario 2 (disable a plugin after migration)](#test-scenario-2-disable-a-plugin-after-migration)
    - [Test scenario 3 (multiple instances, enable a plugin after migration)](#test-scenario-3-multiple-instances-enable-a-plugin-after-migration)
    - [Test scenario 4 (multiple instances, mixed plugin enabled configs)](#test-scenario-4-multiple-instances-mixed-plugin-enabled-configs)

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
RFC](https://github.com/elastic/kibana/blob/main/legacy_rfcs/text/0013_saved_object_migrations.md).

# Algorithm steps

The design goals for the algorithm was to keep downtime below 10 minutes for
100k saved objects while guaranteeing no data loss and keeping steps as simple
and explicit as possible.

The algorithm is implemented as a *state-action machine*, based on <https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf>

The state-action machine defines it's behaviour in steps. Each step is a
transition from a control state s_i to the contral state s_i+1 caused by an
action a_i.

```text
s_i   -> a_i -> s_i+1
s_i+1 -> a_i+1 -> s_i+2
```

Given a control state s1, `next(s1)` returns the next action to execute.
Actions are asynchronous, once the action resolves, we can use the action
response to determine the next state to transition to as defined by the
function `model(state, response)`.

We can then loosely define a step as:

```javascript
s_i+1 = model(s_i, await next(s_i)())
```

When there are no more actions returned by `next` the state-action machine
terminates such as in the DONE and FATAL control states.

What follows is a list of all control states. For each control state the
following is described:

- *next action*: the next action triggered by the current control state
- *new control state*: based on the action response, the possible new control states that the machine will transition to

Since the algorithm runs once for each saved object index the steps below
always reference a single saved object index `.kibana`. When Kibana starts up,
all the steps are also repeated for the `.kibana_task_manager` index but this
is left out of the description for brevity.

## INIT

### Next action

`fetchIndices`

Fetch the saved object indices, mappings and aliases to find the source index
and determine whether we’re migrating from a legacy index or a v1 migrations
index.

### New control state

1. If `.kibana` is pointing to more than one index.

    → [FATAL](#fatal)

2. If `.kibana` is pointing to an index that belongs to a later version of
    Kibana .e.g. a 7.11.0 instance found the `.kibana` alias pointing to
    `.kibana_7.12.0_001` fail the migration

    → [FATAL](#fatal)

3. If `waitForMigrations` was set we're running on a background-tasks node and
we should not participate in the migration but instead wait for the ui node(s)
to complete the migration.

    → [WAIT_FOR_MIGRATION_COMPLETION](#wait_for_migration_completion)

4. If the `.kibana` alias exists we’re migrating from either a v1 or v2 index
and the migration source index is the index the `.kibana` alias points to.

    → [WAIT_FOR_YELLOW_SOURCE](#wait_for_yellow_source)

5. If `.kibana` is a concrete index, we’re migrating from a legacy index

    → [LEGACY_SET_WRITE_BLOCK](#legacy_set_write_block)

6. If there are no `.kibana` indices, this is a fresh deployment. Initialize a
   new saved objects index

    → [CREATE_NEW_TARGET](#create_new_target)

## CREATE_NEW_TARGET

### Next action

`createIndex`

Create the target index. This operation is idempotent, if the index already exist, we wait until its status turns green

### New control state

1. If the action succeeds

    → [MARK_VERSION_INDEX_READY](#mark_version_index_ready)

2. If the action fails with a `index_not_green_timeout`

    → [CREATE_NEW_TARGET](#create_new_target)

## LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION

### Next action

`checkClusterRoutingAllocationCompatible`

Same description and behavior as [CHECK\_CLUSTER\_ROUTING\_ALLOCATION](#check_cluster_routing_allocation), for legacy flow.

### New control state

1. If `cluster.routing.allocation.enabled` has a compatible value.

    → [LEGACY_SET_WRITE_BLOCK](#legacy_set_write_block)

2. If it has a value that will not allow creating new *saved object* indices.

    → [LEGACY_CHECK_CLUSTER_ROUTING_ALLOCATION](#legacy_check_cluster_routing_allocation) (retry)

## LEGACY_SET_WRITE_BLOCK

### Next action

`setWriteBlock`

Set a write block on the legacy index to prevent any older Kibana instances
from writing to the index while the migration is in progress which could cause
lost acknowledged writes.

This is the first of a series of `LEGACY_*` control states that will:

- reindex the concrete legacy `.kibana` index into a `.kibana_pre6.5.0_001` index
- delete the concrete `.kibana` *index* so that we're able to create a `.kibana` *alias*

### New control state

1. If the write block was successfully added

    → [LEGACY_CREATE_REINDEX_TARGET](#legacy_create_reindex_target)

2. If the write block failed because the index doesn't exist, it means another instance already completed the legacy pre-migration. Proceed to the next step.

    → [LEGACY_CREATE_REINDEX_TARGET](#legacy_create_reindex_target)

## LEGACY_CREATE_REINDEX_TARGET

### Next action

`createIndex`

Create a new `.kibana_pre6.5.0_001` index into which we can reindex the legacy
index. (Since the task manager index was converted from a data index into a
saved objects index in 7.4 it will be reindexed into `.kibana_pre7.4.0_001`)

### New control state

1. If the index creation succeeds

    → [LEGACY_REINDEX](#legacy_reindex)

2. If the index creation task failed with a `index_not_green_timeout`

    → [LEGACY_REINDEX_WAIT_FOR_TASK](#legacy_reindex_wait_for_task)

## LEGACY_REINDEX

### Next action

`reindex`

Let Elasticsearch reindex the legacy index into `.kibana_pre6.5.0_001`. (For
the task manager index we specify a `preMigrationScript` to convert the
original task manager documents into valid saved objects)

### New control state

→ [LEGACY_REINDEX_WAIT_FOR_TASK](#legacy_reindex_wait_for_task)

## LEGACY_REINDEX_WAIT_FOR_TASK

### Next action

`waitForReindexTask`

Wait for up to 60s for the reindex task to complete.

### New control state

1. If the reindex task completed

    → [LEGACY_DELETE](#legacy_delete)

2. If the reindex task failed with a `target_index_had_write_block` or
   `index_not_found_exception` another instance already completed this step

    → [LEGACY_DELETE](#legacy_delete)

3. If the reindex task is still in progress

    → [LEGACY_REINDEX_WAIT_FOR_TASK](#legacy_reindex_wait_for_task)

## LEGACY_DELETE

### Next action

`updateAliases`

Use the updateAliases API to atomically remove the legacy index and create a
new `.kibana` alias that points to `.kibana_pre6.5.0_001`.

### New control state

1. If the action succeeds

    → [SET_SOURCE_WRITE_BLOCK](#set_source_write_block)

2. If the action fails with `remove_index_not_a_concrete_index` or
   `index_not_found_exception` another instance has already completed this step.

    → [SET_SOURCE_WRITE_BLOCK](#set_source_write_block)

## WAIT_FOR_MIGRATION_COMPLETION

### Next action

`fetchIndices`

### New control state

1. If the ui node finished the migration

    → [DONE](#done)

2. Otherwise wait 2s and check again

    → [WAIT_FOR_MIGRATION_COMPLETION](#wait_for_migration_completion)

## WAIT_FOR_YELLOW_SOURCE

### Next action

`waitForIndexStatus` (status='yellow')

Wait for the source index to become yellow. This means the index's primary has been allocated and is ready for reading/searching. On a multi node cluster the replicas for this index might not be ready yet but since we're never writing to the source index it does not matter.

### New control state

1. If the action succeeds

    → [UPDATE_SOURCE_MAPPINGS_PROPERTIES](#update_source_mappings_properties)

2. If the action fails with a `index_not_yellow_timeout`

    → [WAIT_FOR_YELLOW_SOURCE](#wait_for_yellow_source)

## UPDATE_SOURCE_MAPPINGS_PROPERTIES

### Next action

`updateSourceMappingsProperties`

This action checks for source mappings changes.
And if there are some, it tries to patch the mappings.

- If there were no changes or the patch was successful, that reports either the changes are compatible or the source is already up to date, depending on the version migration completion state. Either way, it does not require a follow-up reindexing.
- If the patch is failed and the version migration is incomplete, it reports an incompatible state that requires reindexing.
- If the patch is failed and the version migration is complete, it reports an error as it means an incompatible mappings change in an already migrated environment.
The latter usually happens when a new plugin is enabled that brings some incompatible changes or when there are incompatible changes in the development environment.

### New control state

1. If the mappings are updated and the migration is already completed.

    → [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT](#outdated_documents_search_open_pit)

2. If the mappings are updated and the migration is still in progress.

    → [CLEANUP_UNKNOWN_AND_EXCLUDED](#cleanup_unknown_and_excluded)

3. If the mappings are not updated due to incompatible changes and the migration is still in progress.

    → [CHECK_CLUSTER_ROUTING_ALLOCATION](#check_cluster_routing_allocation)

4. If the mappings are not updated due to incompatible changes and the migration is already completed.

    → [FATAL](#fatal)

## CLEANUP_UNKNOWN_AND_EXCLUDED

### Next action

`cleanupUnknownAndExcluded`

This action searches for and deletes *saved objects* which are of unknown or excluded type.

- Saved objects become unknown when their type is no longer registered in the *typeRegistry*. This can happen when disabling plugins.
- Also, saved objects can be excluded from upgrade with the `excludeOnUpgrade` flag in their type definition.

In order to allow Kibana to discard unknown saved objects, users must set the [migrations.discardUnknownObjects](https://www.elastic.co/guide/en/kibana/current/resolve-migrations-failures.html#unknown-saved-object-types) flag.

### New control state

1. If unknown docs are found and Kibana is not configured to ignore them.

    → [FATAL](#fatal)

2. If the delete operation is launched and we can wait for it.

    → [CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK](#cleanup_unknown_and_excluded_wait_for_task)

## CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK

### Next action

`waitForDeleteByQueryTask`

The cleanup task on the previous step is launched asynchronously, tracked by a specific `taskId`. On this step, we actively wait for it to finish, and we do that with a large timeout.

### New control state

1. If the task finishes before the timeout.

    → [PREPARE_COMPATIBLE_MIGRATION](#prepare_compatible_migration)

2. If we hit the timeout whilst waiting for the task to be completed, but we still have some retry attempts left.

    → [CLEANUP_UNKNOWN_AND_EXCLUDED_WAIT_FOR_TASK](#cleanup_unknown_and_excluded_wait_for_task)

3. If some errors occur whilst cleaning up, there could be other instances performing the cleanup in parallel, deleting the documents that we intend to delete. In that scenario, we will launch the operation again.

    → [CLEANUP_UNKNOWN_AND_EXCLUDED](#cleanup_unknown_and_excluded)

4. If we hit the timeout and we run out of retries.

    → [FATAL](#fatal)

## PREPARE_COMPATIBLE_MIGRATION

### Next action

`updateAliases`

At this point, we have successfully updated the index mappings. We are performing a *compatible migration*, aka updating *saved objects* in place on the existing index. In order to prevent other Kibana instances from writing documents whilst we update them, we remove the previous version alias. We also set set the current version alias, which will cause other instances' migrators to directly perform an *up-to-date migration*.

### New control state

1. If the aliases are updated successfully and some documents have been deleted on the previous step.

    → [REFRESH_SOURCE](#refresh_source)

2. If the aliases are updated successfully and we did not delete any documents on the previous step.

    → [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT](#outdated_documents_search_open_pit)

3. When unexpected errors occur when updating the aliases.

    → [FATAL](#fatal)

## REFRESH_SOURCE

### Next action

`refreshIndex`

We are performing a *compatible migration*, and we discarded some unknown and excluded saved object documents. We must refresh the index so that subsequent queries no longer find these removed documents.

### New control state

1. If the index is refreshed successfully.

    → [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT](#outdated_documents_search_open_pit)

2. When unexpected errors occur during the refresh.

    → [FATAL](#fatal)

## CHECK_CLUSTER_ROUTING_ALLOCATION

### Next action

`checkClusterRoutingAllocationEnabled`

Check that replica allocation is enabled from cluster settings (`cluster.routing.allocation.enabled`). Migrations will fail when replica allocation is disabled during the bulk index operation that waits for all active shards. Migrations wait for all active shards to ensure that saved objects are replicated to protect against data loss.

The Elasticsearch documentation mentions switching off replica allocation when restoring a cluster and this is a setting that might be overlooked when a restore is done. Migrations will fail early if replica allocation is incorrectly set to avoid adding a write block to the old index before running into a failure later.

If replica allocation is set to 'all', the migration continues to fetch the saved object indices.

### New control state

The Elasticsearch shard allocation cluster setting `cluster.routing.allocation.enable` needs to be unset or set to 'all'. When set to 'primaries', 'new_primaries' or 'none', the migration will timeout when waiting for index green status before bulk indexing because the replica cannot be allocated.

As per the Elasticsearch [docs](https://www.elastic.co/guide/en/elasticsearch/reference/8.2/restart-cluster.html#restart-cluster-rolling), when Cloud performs a rolling restart such as during an upgrade, it will temporarily disable shard allocation. Kibana therefore keeps retrying the INIT step to wait for shard allocation to be enabled again.

The check only considers persistent and transient settings and does not take static configuration in `elasticsearch.yml` into account since there are no known use cases for doing so. If `cluster.routing.allocation.enable` is configured in `elaticsearch.yml` and not set to the default of 'all', the migration will timeout. Static settings can only be returned from the `nodes/info` API.

1. If `cluster.routing.allocation.enabled` has a compatible value.

    → [CHECK_UNKNOWN_DOCUMENTS](#check_unknown_documents)

2. If it has a value that will not allow creating new *saved object* indices.

    → [CHECK_CLUSTER_ROUTING_ALLOCATION](#check_cluster_routing_allocation) (retry)

## CHECK_UNKNOWN_DOCUMENTS

Saved objects are unknown when their type is not registered in the *typeRegistry*. This can happen when disabling plugins, or when deprecated plugins are removed during a major upgrade.

During a *reindex migration*, these documents can be discarded if Kibana is configured with the [migrations.discardUnknownObjects](https://www.elastic.co/guide/en/kibana/current/resolve-migrations-failures.html#unknown-saved-object-types) flag.

### Next action

1. If no unknown documents are found, or Kibana is configured to discard them.

    → [SET_SOURCE_WRITE_BLOCK](#set_source_write_block)

2. If some unknown documents are found and Kibana is NOT configured to discard them.

    → [FATAL](#fatal)

## SET_SOURCE_WRITE_BLOCK

### Next action

`setWriteBlock`

Set a write block on the source index to prevent any older Kibana instances from writing to the index while the migration is in progress which could cause lost acknowledged writes.

### New control state

→ [CREATE_REINDEX_TEMP](#create_reindex_temp)

## CREATE_REINDEX_TEMP

### Next action

`createIndex`

This operation is idempotent, if the index already exist, we wait until its status turns green.

- Because we will be transforming documents before writing them into this index, we can already set the mappings to the target mappings for this version. The source index might contain documents belonging to a disabled plugin. So set `dynamic: false` mappings for any unknown saved object types.
- (Since we never query the temporary index we can potentially disable refresh to speed up indexing performance. Profile to see if gains justify complexity)

### New control state

1. If the action succeeds

    → [REINDEX_SOURCE_TO_TEMP_OPEN_PIT](#reindex_source_to_temp_open_pit)

2. If the action fails with a `index_not_green_timeout`

    → [CREATE_REINDEX_TEMP](#create_reindex_temp)

## REINDEX_SOURCE_TO_TEMP_OPEN_PIT

### Next action

`openPIT`

Open a PIT. Since there is a write block on the source index there is basically no overhead to keeping the PIT so we can lean towards a larger `keep_alive` value like 10 minutes.

### New control state

→ [REINDEX_SOURCE_TO_TEMP_READ](#reindex_source_to_temp_read)

## REINDEX_SOURCE_TO_TEMP_READ

### Next action

`readNextBatchOfSourceDocuments`

Read the next batch of outdated documents from the source index by using search after with our PIT.

### New control state

1. If the batch contained > 0 documents

    → [REINDEX_SOURCE_TO_TEMP_TRANSFORM](#reindex_source_to_temp_transform)

2. If there are no more documents returned

    → [REINDEX_SOURCE_TO_TEMP_CLOSE_PIT](#reindex_source_to_temp_close_pit)

## REINDEX_SOURCE_TO_TEMP_TRANSFORM

### Next action

`transformRawDocs`

Transform the current batch of documents

In order to support sharing saved objects to multiple spaces in 8.0, the
transforms will also regenerate document `_id`'s. To ensure that this step
remains idempotent, the new `_id` is deterministically generated using UUIDv5
ensuring that each Kibana instance generates the same new `_id` for the same document.

### New control state

→ [REINDEX_SOURCE_TO_TEMP_INDEX_BULK](#reindex_source_to_temp_index_bulk)

## REINDEX_SOURCE_TO_TEMP_INDEX_BULK

### Next action

`bulkIndexTransformedDocuments`

Use the bulk API create action to write a batch of up-to-date documents. The
create action ensures that there will be only one write per reindexed document
even if multiple Kibana instances are performing this step. Use
`refresh=false` to speed up the create actions, the `UPDATE_TARGET_MAPPINGS_PROPERTIES`
step will ensure that the index is refreshed before we start serving traffic.

The following errors are ignored because it means another instance already
completed this step:

- documents already exist in the temp index
- temp index has a write block
- temp index is not found

### New control state

1. If `currentBatch` is the last batch in `bulkOperationBatches`

    → [REINDEX_SOURCE_TO_TEMP_READ](#reindex_source_to_temp_read)

2. If there are more batches left in `bulkOperationBatches`

    → [REINDEX_SOURCE_TO_TEMP_INDEX_BULK](#reindex_source_to_temp_index_bulk)

## REINDEX_SOURCE_TO_TEMP_CLOSE_PIT

### Next action

`closePIT`

### New control state

→ [SET_TEMP_WRITE_BLOCK](#set_temp_write_block)

## SET_TEMP_WRITE_BLOCK

### Next action

`setWriteBlock`

Set a write block on the temporary index so that we can clone it.

### New control state

→ [CLONE_TEMP_TO_TARGET](#clone_temp_to_target)

## CLONE_TEMP_TO_TARGET

### Next action

`cloneIndex`

Ask elasticsearch to clone the temporary index into the target index. If the target index already exists (because another node already started the clone operation), wait until the clone is complete by waiting for a green index status.

We can’t use the temporary index as our target index because one instance can complete the migration, delete a document, and then a second instance starts the reindex operation and re-creates the deleted document. By cloning the temporary index and only accepting writes/deletes from the cloned target index, we prevent lost acknowledged deletes.

### New control state

1. If the action succeeds.

    → [REFRESH_TARGET](#refresh_target)

2. If the action fails with an `index_not_green_timeout`.

    → [CLONE_TEMP_TO_TARGET](#clone_temp_to_target)

## REFRESH_TARGET

### Next action

`refreshIndex`

We refresh the temporary clone index, to make sure newly added documents are taken into account.

### New control state

1. If the index is refreshed successfully.

    → [OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT](#outdated_documents_search_open_pit)

2. When unexpected errors occur during the refresh.

    → [FATAL](#fatal)

## OUTDATED_DOCUMENTS_SEARCH_OPEN_PIT

### Next action

`openPit`

Any saved objects that belong to previous versions are updated in the index.
This operation is performed in batches, leveraging the [Point in Time API](https://www.elastic.co/guide/en/elasticsearch/reference/current/point-in-time-api.html).

### New control state

1. If the PIT is created successfully.

    → [OUTDATED_DOCUMENTS_SEARCH_READ](#outdated_documents_search_read)

2. When unexpected errors occur whilst creating the PIT.

    → [FATAL](#fatal)

## OUTDATED_DOCUMENTS_SEARCH_READ

### Next action

`readWithPit(outdatedDocumentsQuery)`

Search for outdated saved object documents. Will return one batch of
documents.

If another instance has a disabled plugin it will reindex that plugin's
documents without transforming them. Because this instance doesn't know which
plugins were disabled by the instance that performed the
`REINDEX_SOURCE_TO_TEMP_TRANSFORM` step, we need to search for outdated documents
and transform them to ensure that everything is up to date.

### New control state

1. Found outdated documents.

    → [OUTDATED_DOCUMENTS_TRANSFORM](#outdated_documents_transform)

2. There aren't any outdated documents left to read, and we can proceed with the flow.

    → [OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT](#outdated_documents_search_close_pit)

3. There aren't any outdated documents left to read, but we encountered *corrupt* documents or *transform errors*, and Kibana is not configured to ignore them (using `migrations.discardCorruptObjects` flag).

    → [FATAL](#fatal)

4. If we encounter an error of the form `es_response_too_large` whilst reading *saved object* documents, we retry with a smaller batch size.

    → [OUTDATED_DOCUMENTS_SEARCH_READ](#outdated_documents_search_read)

## OUTDATED_DOCUMENTS_TRANSFORM

### Next action

`transformDocs`

### New control state

1. If all of the outdated documents in the current batch are transformed successfully, or Kibana is configured to ignore *corrupt* documents and *transform* errors. We managed to break down the current set of documents into smaller batches successfully, so we can start indexing them one by one.

    → [TRANSFORMED_DOCUMENTS_BULK_INDEX](#transformed_documents_bulk_index)

2. If the batch contains corrupt documents or transform errors, and Kibana is not configured to discard them, we do not index them, we simply read the next batch, accumulating encountered errors.

    → [OUTDATED_DOCUMENTS_SEARCH_READ](#outdated_documents_search_read)

3. If we can't split the set of documents in batches small enough to not exceed the `maxBatchSize`, we fail the migration.

    → [FATAL](#fatal)

## TRANSFORMED_DOCUMENTS_BULK_INDEX

### Next action

`bulkOverwriteTransformedDocuments`

Once transformed we use an index operation to overwrite the outdated document with the up-to-date version. Optimistic concurrency control ensures that we only overwrite the document once so that any updates/writes by another instance which already completed the migration aren’t overwritten and lost. The transformed documents are split in different batches, and then each batch is bulk indexed.

### New control state

1. We have more batches to bulk index.

    → [TRANSFORMED_DOCUMENTS_BULK_INDEX](#transformed_documents_bulk_index)

2. We have indexed all the batches of the current read operation. Proceed to read more documents.

    → [OUTDATED_DOCUMENTS_SEARCH_READ](#outdated_documents_search_read)

## OUTDATED_DOCUMENTS_SEARCH_CLOSE_PIT

### Next action

`closePit`

After reading, transforming and bulk indexingn all saved objects, we can close our PIT.

### New control state

1. If we can close the PIT successfully, and we did update some documents.

    → [OUTDATED_DOCUMENTS_REFRESH](#outdated_documents_refresh)

2. If we can close the PIT successfully, and we did not update any documents.

    → [CHECK_TARGET_MAPPINGS](#check_target_mappings)

3. An unexpected error occurred whilst closing the PIT.

    → [FATAL](#fatal)

## OUTDATED_DOCUMENTS_REFRESH

### Next action

`refreshIndex`

We updated some outdated documents, we must refresh the target index to pick up the changes.

### New control state

1. If the index is refreshed successfully.

    → [CHECK_TARGET_MAPPINGS](#check_target_mappings)

2. When unexpected errors occur during the refresh.****

    → [FATAL](#fatal)

## CHECK_TARGET_MAPPINGS

### Next action

`checkTargetTypesMappings`

Compare the calculated mappings' hashes against those stored in the `<index>.mappings._meta`.

### New control state

1. If calculated mappings don't match, we must update them.

    → [UPDATE_TARGET_MAPPINGS_PROPERTIES](#update_target_mappings_properties)

2. If calculated mappings and stored mappings match, we can skip directly to the next step.

    → [CHECK_VERSION_INDEX_READY_ACTIONS](#check_version_index_ready_actions)

## UPDATE_TARGET_MAPPINGS_PROPERTIES

### Next action

`updateAndPickupMappings`

If another instance has some plugins disabled it will disable the mappings of that plugin's types when creating the temporary index. This action will
update the mappings and then use an update_by_query to ensure that all fields are “picked-up” and ready to be searched over.

### New control state

→ [UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK](#update_target_mappings_properties_wait_for_task)

## UPDATE_TARGET_MAPPINGS_PROPERTIES_WAIT_FOR_TASK

### Next action

`waitForPickupUpdatedMappingsTask`

### New control state

→ [MARK_VERSION_INDEX_READY](#mark_version_index_ready)

## CHECK_VERSION_INDEX_READY_ACTIONS

Check if the state contains some `versionIndexReadyActions` from the `INIT` action.

### Next action

None

### New control state

1. If there are some `versionIndexReadyActions`, we performed a full migration and need to point the aliases to our newly migrated index.

    → [MARK_VERSION_INDEX_READY](#mark_version_index_ready)

2. If there are no `versionIndexReadyActions`, another instance already completed this migration and we only transformed outdated documents and updated the mappings for in case a new plugin was enabled.

    → [DONE](#done)

## MARK_VERSION_INDEX_READY

### Next action

`updateAliases`

Atomically apply the `versionIndexReadyActions` using the _alias actions API. By performing the following actions we guarantee that if multiple versions of Kibana started the upgrade in parallel, only one version will succeed.

1. verify that the current alias is still pointing to the source index
2. Point the version alias and the current alias to the target index.
3. Remove the temporary index

### New control state

1. If all the actions succeed we’re ready to serve traffic

    → [DONE](#done)

2. If action (1) fails with alias_not_found_exception or action (3) fails with index_not_found_exception another instance already completed the migration

    → [MARK_VERSION_INDEX_READY_CONFLICT](#mark_version_index_ready_conflict)

## MARK_VERSION_INDEX_READY_CONFLICT

### Next action

`fetchIndices`

Fetch the saved object indices

### New control state

If another instance completed a migration from the same source we need to verify that it is running the same version.

1. If the current and version aliases are pointing to the same index the instance that completed the migration was on the same version and it’s safe to start serving traffic.

    → [DONE](#done)

2. If the other instance was running a different version we fail the migration. Once we restart one of two things can happen: the other instance is an older version and we will restart the migration, or, it’s a newer version and we will refuse to start up.

    → [FATAL](#fatal)

## FATAL

Unfortunately, this migrator failed at some step. Please check the logs and identify the cause. Once addressed, restart Kibana again to restart / resume the migration.

## DONE

Congratulations, this migrator finished the saved objects migration for its index.

# Manual QA Test Plan

## 1. Legacy pre-migration

When upgrading from a legacy index additional steps are required before the
regular migration process can start.

We have the following potential legacy indices:

- v5.x index that wasn't upgraded -> kibana should refuse to start the migration
- v5.x index that was upgraded to v6.x: `.kibana-6` *index* with `.kibana` *alias*
- < v6.5 `.kibana` *index* (Saved Object Migrations were
   introduced in v6.5 <https://github.com/elastic/kibana/pull/20243>)
- TODO: Test versions which introduced the `kibana_index_template` template?
- < v7.4 `.kibana_task_manager` *index* (Task Manager started
   using Saved Objects in v7.4 <https://github.com/elastic/kibana/pull/39829>)

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

### Test scenario 1 (enable a plugin after migration)

1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
4. Upgrade Kibana to v7.11 making sure the plugin in step (3) is still disabled.
5. Enable the plugin from step (3)
6. Restart Kibana
7. Ensure that the document from step (2) has been migrated
   (`migrationVersion` contains 7.11.0)

### Test scenario 2 (disable a plugin after migration)

1. Start an old version of Kibana (< 7.11)
2. Create a document that we know will be migrated in a later version (i.e.
   create a `dashboard`)
3. Upgrade Kibana to v7.11 making sure the plugin in step (3) is enabled.
4. Disable the plugin to which the document belongs (i.e `dashboard` plugin)
5. Restart Kibana
6. Ensure that Kibana logs a warning, but continues to start even though there
   are saved object documents which don't belong to an enable plugin

### Test scenario 3 (multiple instances, enable a plugin after migration)

Follow the steps from 'Test scenario 1', but perform the migration with
multiple instances of Kibana

### Test scenario 4 (multiple instances, mixed plugin enabled configs)

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
<!-- markdownlint-enable MD024 MD041 -->
