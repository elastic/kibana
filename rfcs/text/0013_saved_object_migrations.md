- Start Date: 2020-05-11
- RFC PR: (leave this empty)
- Kibana Issue: (leave this empty)

---
- [1. Summary](#1-summary)
- [2. Motivation](#2-motivation)
- [3. Saved Object Migration Errors](#3-saved-object-migration-errors)
- [4. Design](#4-design)
  - [4.0 Assumptions and tradeoffs](#40-assumptions-and-tradeoffs)
  - [4.1 Discover and remedy potential failures before any downtime](#41-discover-and-remedy-potential-failures-before-any-downtime)
  - [4.2 Automatically retry failed migrations until they succeed](#42-automatically-retry-failed-migrations-until-they-succeed)
  - [4.2.1 Idempotent migrations performed without coordination](#421-idempotent-migrations-performed-without-coordination)
    - [4.2.1.1 Restrictions](#4211-restrictions)
    - [4.2.1.2 Migration algorithm: Cloned index per version](#4212-migration-algorithm-cloned-index-per-version)
      - [Known weaknesses:](#known-weaknesses)
    - [4.2.1.3 Upgrade and rollback procedure](#4213-upgrade-and-rollback-procedure)
    - [4.2.1.4 Handling documents that belong to a disabled plugin](#4214-handling-documents-that-belong-to-a-disabled-plugin)
- [5. Alternatives](#5-alternatives)
  - [5.1 Rolling upgrades](#51-rolling-upgrades)
  - [5.2 Single node migrations coordinated through a lease/lock](#52-single-node-migrations-coordinated-through-a-leaselock)
    - [5.2.1 Migration algorithm](#521-migration-algorithm)
    - [5.2.2 Document lock algorithm](#522-document-lock-algorithm)
    - [5.2.3 Checking for "weak lease" expiry](#523-checking-for-weak-lease-expiry)
  - [5.3 Minimize data loss with mixed Kibana versions during 7.x](#53-minimize-data-loss-with-mixed-kibana-versions-during-7x)
  - [5.4 In-place migrations that re-use the same index (8.0)](#54-in-place-migrations-that-re-use-the-same-index-80)
    - [5.4.1 Migration algorithm (8.0):](#541-migration-algorithm-80)
    - [5.4.2 Minimizing data loss with unsupported upgrade configurations (8.0)](#542-minimizing-data-loss-with-unsupported-upgrade-configurations-80)
  - [5.5 Tag objects as “invalid” if their transformation fails](#55-tag-objects-as-invalid-if-their-transformation-fails)
- [6. How we teach this](#6-how-we-teach-this)
- [7. Unresolved questions](#7-unresolved-questions)

# 1. Summary

Improve the Saved Object migration algorithm to ensure a smooth Kibana upgrade
procedure.

# 2. Motivation

Kibana version upgrades should have a minimal operational impact. To achieve
this, users should be able to rely on:

1. A predictable downtime window.
2. A small downtime window.
   1. (future) provide a small downtime window on indices with 10k or even
      a 100k documents. 
3. The ability to discover and remedy potential failures before initiating the
   downtime window.
4. Quick roll-back in case of failure.
5. Detailed documentation about the impact of downtime on the features they
   are using (e.g. actions, task manager, fleet, reporting).
6. Mixed Kibana versions shouldn’t cause data loss.
7. (stretch goal) Maintain read-only functionality during the downtime window.

The biggest hurdle to achieving the above is Kibana’s Saved Object migrations.
Migrations aren’t resilient and require manual intervention anytime an error
occurs (see [3. Saved Object Migration
Errors](#3-saved-object-migration-errors)). 

It is impossible to discover these failures before initiating downtime. Errors
often force users to roll-back to a previous version of Kibana or cause hours
of downtime. To retry the migration, users are asked to manually delete a
`.kibana_x` index. If done incorrectly this can lead to data loss, making it a
terrifying experience (restoring from a pre-upgrade snapshot is a safer
alternative but not mentioned in the docs or logs). 

Cloud users don’t have access to Kibana logs to be able to identify and remedy
the cause of the migration failure. Apart from blindly retrying migrations by
restoring a previous snapshot, cloud users are unable to remedy a failed
migration and have to escalate to support which can further delay resolution. 

Taken together, version upgrades are a major operational risk and discourage
users from adopting the latest features. 

# 3. Saved Object Migration Errors

Any of the following classes of errors could result in a Saved Object
migration failure which requires manual intervention to resolve: 

1. A bug in a plugin’s registered document transformation function causes it
   to throw an exception on _valid_ data.
2. _Invalid_ data stored in Elasticsearch causes a plugin’s registered
   document transformation function to throw an exception .
3. Failures resulting from an unhealthy Elasticsearch cluster:
    1. Maximum shards open
    2. Too many scroll contexts
    3. `circuit_breaking_exception` (insufficient heap memory)
    4. `process_cluster_event_timeout_exception` for index-aliases, create-index, put-mappings
    5. Read-only indices due to low disk space (hitting the flood_stage watermark)
    6. Re-index failed: search rejected due to missing shards
    7. `TooManyRequests` while doing a `count` of documents requiring a migration
    8. Bulk write failed: primary shard is not active
4. The Kibana process is killed while migrations are in progress.

# 4. Design
## 4.0 Assumptions and tradeoffs
The proposed design makes several important assumptions and tradeoffs.

**Background:**

The 7.x upgrade documentation lists taking an Elasticsearch snapshot as a
required step, but we instruct users to retry migrations and perform rollbacks
by deleting the failed `.kibana_n` index and pointing the `.kibana` alias to
`.kibana_n-1`:
 - [Handling errors during saved object
migrations.](https://github.com/elastic/kibana/blob/75444a9f1879c5702f9f2b8ad4a70a3a0e75871d/docs/setup/upgrade/upgrade-migrations.asciidoc#handling-errors-during-saved-object-migrations)
 - [Rolling back to a previous version of Kibana.](https://github.com/elastic/kibana/blob/75444a9f1879c5702f9f2b8ad4a70a3a0e75871d/docs/setup/upgrade/upgrade-migrations.asciidoc#rolling-back-to-a-previous-version-of-kib) 
 - Server logs from failed migrations.

**Assumptions and tradeoffs:**
1. It is critical to maintain a backup index during 7.x to ensure that anyone 
   following the existing upgrade / rollback procedures don't end up in a
   position where they no longer can recover their data.
   1. This excludes us from introducing in-place migrations to support huge
      indices during 7.x.
2. The simplicity of idempotent, coordination-free migrations outweighs the
   restrictions this will impose on the kinds of migrations we're able to
   support in the future. See (4.2.1)
3. A saved object type (and it's associated migrations) will only ever be
   owned by one plugin. If pluginA registers saved object type `plugin_a_type`
   then pluginB must never register that same type, even if pluginA is
   disabled. Although we cannot enforce it on third-party plugins, breaking
   this assumption may lead to data loss.

## 4.1 Discover and remedy potential failures before any downtime

> Achieves goals: (2.3)
> Mitigates errors: (3.1), (3.2)

1. Introduce a CLI option to perform a dry run migration to allow
   administrators to locate and fix potential migration failures without
   taking their existing Kibana node(s) offline.
2. To have the highest chance of surfacing potential failures such as low disk
   space, dry run migrations should not be mere simulations. A dry run should
   perform a real migration in a way that doesn’t impact the existing Kibana
   cluster.
3. The CLI should generate a migration report to make it easy to create a
   support request from a failed migration dry run.
    1. The report would be an NDJSON export of all failed objects.
    2. If support receives such a report, we could modify all the objects to
       ensure the migration would pass and send this back to the client.
    3. The client can then import the updated objects using the standard Saved
       Objects NDJSON import and run another dry run to verify all problems
       have been fixed.
4. Make running dry run migrations a required step in the upgrade procedure
   documentation.
5. (Optional) Add dry run migrations to the standard cloud upgrade procedure?

## 4.2 Automatically retry failed migrations until they succeed

> Achieves goals: (2.2), (2.6)
> Mitigates errors (3.3) and (3.4)

External conditions such as failures from an unhealthy Elasticsearch cluster
(3.3) can cause the migration to fail. The Kibana cluster should be able to
recover automatically once these external conditions are resolved. There are
two broad approaches to solving this problem based on whether or not
migrations are idempotent: 

| Idempotent migrations |Description                                                |
| --------------------- | --------------------------------------------------------- |
| Yes                   | Idempotent migrations performed without coordination      |
| No                    | Single node migrations coordinated through a lease / lock |

Idempotent migrations don't require coordination making the algorithm
significantly less complex and will never require manual intervention to
retry. We, therefore, prefer this solution, even though it introduces
restrictions on migrations (4.2.1.1). For other alternatives that were
considered see section [(5)](#5-alternatives).

## 4.2.1 Idempotent migrations performed without coordination

The migration system can be said to be idempotent if the same results are
produced whether the migration was run once or multiple times. This property
should hold even if new (up to date) writes occur in between migration runs
which introduces the following restrictions:

### 4.2.1.1 Restrictions

1. All document transforms need to be deterministic, that is a document
   transform will always return the same result for the same set of inputs. 
2. It should always be possible to construct the exact set of inputs required
   for (1) at any point during the migration process (before, during, after). 

Although these restrictions require significant changes, it does not prevent
known upcoming migrations such as [sharing saved-objects in multiple spaces](https://github.com/elastic/kibana/issues/27004) or [splitting a saved
object into multiple child
documents](https://github.com/elastic/kibana/issues/26602). To ensure that
these migrations are idempotent, they will have to generate new saved object
id's deterministically with e.g. UUIDv5.


### 4.2.1.2 Migration algorithm: Cloned index per version
Note:
- The description below assumes the migration algorithm is released in 7.10.0.
  So >= 7.10.0 will use the new algorithm.
- We refer to the alias and index that outdated nodes use as the source alias
  and source index.
- Every version performs a migration even if mappings or documents aren't outdated.

1. Locate the source index by fetching kibana indices:
   
   ```
   GET '/_indices/.kibana,.kibana_7.10.0'
   ```
   
   The source index is:
   1. the index the `.kibana` alias points to, or if it doesn't exist,
   2. the v6.x `.kibana` index
   
   If none of the aliases exists, this is a new Elasticsearch cluster and no
   migrations are necessary. Create the `.kibana_7.10.0_001` index with the
   following aliases: `.kibana` and `.kibana_7.10.0`.
2. If the source is a < v6.5 `.kibana` index or < 7.4 `.kibana_task_manager`
   index prepare the legacy index for a migration:
   1. Mark the legacy index as read-only and wait for all in-flight operations to drain (requires https://github.com/elastic/elasticsearch/pull/58094). This prevents any further writes from outdated nodes. Assuming this API is similar to the existing `/<index>/_close` API, we expect to receive `"acknowledged" : true` and `"shards_acknowledged" : true`. If all shards don’t acknowledge within the timeout, retry the operation until it succeeds.
   2. Clone the legacy index into a new index which has writes enabled. Use a fixed index name i.e `.kibana_pre6.5.0_001` or `.kibana_task_manager_pre7.4.0_001`. `POST /.kibana/_clone/.kibana_pre6.5.0_001?wait_for_active_shards=all {"settings": {"index.blocks.write": false}}`. Ignore errors if the clone already exists. Ignore errors if the legacy source doesn't exist.
   3. Wait for the cloning to complete `GET /_cluster/health/.kibana_pre6.5.0_001?wait_for_status=green&timeout=60s` If cloning doesn’t complete within the 60s timeout, log a warning for visibility and poll again.
   4. Apply the `convertToAlias` script if defined `POST /.kibana_pre6.5.0_001/_update_by_query?conflicts=proceed {"script": {...}}`. The `convertToAlias` script will have to be idempotent, preferably setting `ctx.op="noop"` on subsequent runs to avoid unecessary writes.
   5. Delete the legacy index and replace it with an alias of the same name
      ```
      POST /_aliases
      {
        "actions" : [
            { "add":  { "index": ".kibana_pre6.5.0_001", "alias": ".kibana" } },
            { "remove_index": { "index": ".kibana" } }
        ]
      }
      ```.
      Unlike the delete index API, the `remove_index` action will fail if
      provided with an _alias_. Ignore "The provided expression [.kibana]
      matches an alias, specify the corresponding concrete indices instead."
      or "index_not_found_exception" errors. These actions are applied
      atomically so that other Kibana instances will always see either a
      `.kibana` index or an alias, but never neither.
   6. Use the cloned `.kibana_pre6.5.0_001` as the source for the rest of the migration algorithm.
3. If `.kibana` and `.kibana_7.10.0` both exists and are pointing to the same index this version's migration has already been completed.
   1. Because the same version can have plugins enabled at any point in time,
      perform the mappings update in step (6) and migrate outdated documents
      with step (7).
   2. Skip to step (9) to start serving traffic.
4. Fail the migration if:
   1. `.kibana` is pointing to an index that belongs to a later version of Kibana .e.g. `.kibana_7.12.0_001`
   2. (Only in 8.x) The source index contains documents that belong to an unknown Saved Object type (from a disabled plugin). Log an error explaining that the plugin that created these documents needs to be enabled again or that these objects should be deleted. See section (4.2.1.4).
5. Mark the source index as read-only and wait for all in-flight operations to drain (requires https://github.com/elastic/elasticsearch/pull/58094). This prevents any further writes from outdated nodes. Assuming this API is similar to the existing `/<index>/_close` API, we expect to receive `"acknowledged" : true` and `"shards_acknowledged" : true`. If all shards don’t acknowledge within the timeout, retry the operation until it succeeds.
6. Clone the source index into a new target index which has writes enabled. All nodes on the same version will use the same fixed index name e.g. `.kibana_7.10.0_001`. The `001` postfix isn't used by Kibana, but allows for re-indexing an index should this be required by an Elasticsearch upgrade. E.g. re-index `.kibana_7.10.0_001` into `.kibana_7.10.0_002` and point the `.kibana_7.10.0` alias to `.kibana_7.10.0_002`.
   1. `POST /.kibana_n/_clone/.kibana_7.10.0_001?wait_for_active_shards=all {"settings": {"index.blocks.write": false}}`. Ignore errors if the clone already exists.
   2. Wait for the cloning to complete `GET /_cluster/health/.kibana_7.10.0_001?wait_for_status=green&timeout=60s` If cloning doesn’t complete within the 60s timeout, log a warning for visibility and poll again.
7. Update the mappings of the target index
   1. Retrieve the existing mappings including the `migrationMappingPropertyHashes` metadata.
   2. Update the mappings with `PUT /.kibana_7.10.0_001/_mapping`. The API deeply merges any updates so this won't remove the mappings of any plugins that were enabled in a previous version but are now disabled.
   3. Ensure that fields are correctly indexed using the target index's latest mappings `POST /.kibana_7.10.0_001/_update_by_query?conflicts=proceed`. In the future we could optimize this query by only targeting documents:
      1. That belong to a known saved object type.
      2. Which don't have outdated migrationVersion numbers since these will be transformed anyway.
      3. That belong to a type whose mappings were changed by comparing the `migrationMappingPropertyHashes`. (Metadata, unlike the mappings isn't commutative, so there is a small chance that the metadata hashes do not accurately reflect the latest mappings, however, this will just result in an less efficient query).
8. Transform documents by reading batches of outdated documents from the target index then transforming and updating them with optimistic concurrency control. 
   1. Ignore any version conflict errors.
   2. If a document transform throws an exception, add the document to a failure list and continue trying to transform all other documents. If any failures occured, log the complete list of documents that failed to transform. Fail the migration.
9.  Mark the migration as complete. This is done as a single atomic
    operation (requires https://github.com/elastic/elasticsearch/pull/58100)
    to guarantees when multiple versions of Kibana are performing the
    migration in parallel, only one version will win. E.g. if 7.11 and 7.12
    are started in parallel and migrate from a 7.9 index, either 7.11 or 7.12
    should succeed and accept writes, but not both.
   3. Checks that `.kibana` alias is still pointing to the source index
   4. Points the `.kibana_7.10.0` and `.kibana` aliases to the target index.
   5. If this fails with a "required alias [.kibana] does not exist" error fetch `.kibana` again:
      1. If `.kibana` is _not_ pointing to our target index fail the migration.
      2. If `.kibana` is pointing to our target index the migration has succeeded and we can proceed to step (10).
10. Start serving traffic. All saved object reads/writes happen through the
    version-specific alias `.kibana_7.10.0`.

Together with the limitations, this algorithm ensures that migrations are
idempotent. If two nodes are started simultaneously, both of them will start
transforming documents in that version's target index, but because migrations
are idempotent, it doesn’t matter which node’s writes win.

#### Known weaknesses:
(Also present in our existing migration algorithm since v7.4)
When the task manager index gets reindexed a reindex script is applied.
Because we delete the original task manager index there is no way to rollback
a failed task manager migration without a snapshot. Although losing the task
manager data has a fairly low impact.

(Also present in our existing migration algorithm since v6.5)
If the outdated instance isn't shutdown before starting the migration, the
following data-loss scenario is possible: 
1. Upgrade a 7.9 index without shutting down the 7.9 nodes
2. Kibana v7.10 performs a migration and after completing points `.kibana`
   alias to `.kibana_7.11.0_001`
3. Kibana v7.9 writes unmigrated documents into `.kibana`.
4. Kibana v7.10 performs a query based on the updated mappings of documents so
   results potentially don't match the acknowledged write from step (3).

Note:
 - Data loss won't occur if both nodes have the updated migration algorithm
   proposed in this RFC. It is only when one of the nodes use the existing
   algorithm that data loss is possible.
 - Once v7.10 is restarted it will transform any outdated documents making
   these visible to queries again.

It is possible to work around this weakness by introducing a new alias such as
`.kibana_current` so that after a migration the `.kibana` alias will continue
to point to the outdated index. However, we decided to keep using the
`.kibana` alias despite this weakness for the following reasons:
  - Users might rely on `.kibana` alias for snapshots, so if this alias no
    longer points to the latest index their snapshots would no longer backup
    kibana's latest data.
  - Introducing another alias introduces complexity for users and support.
    The steps to diagnose, fix or rollback a failed migration will deviate
    depending on the 7.x version of Kibana you are using.
  - The existing Kibana documentation clearly states that outdated nodes should
    be shutdown, this scenario has never been supported by Kibana.

<details>
  <summary>In the future, this algorithm could enable (2.6) "read-only functionality during the downtime window" but this is outside of the scope of this RFC.</summary>

  Although the migration algorithm guarantees there's no data loss while providing read-only access to outdated nodes, this could cause plugins to behave in unexpected ways. If we wish to persue it in the future, enabling read-only functionality during the downtime window will be it's own project and must include an audit of all plugins' behaviours.
</details>

### 4.2.1.3 Upgrade and rollback procedure
When a newer Kibana starts an upgrade, it blocks all writes to the outdated index to prevent data loss. Since Kibana is not designed to gracefully handle a read-only index this could have unintended consequences such as a task executing multiple times but never being able to write that the task was completed successfully. To prevent unintended consequences, the following procedure should be followed when upgrading Kibana:

1. Gracefully shutdown outdated nodes by sending a `SIGTERM` signal
   1. Node starts returning `503` from it's healthcheck endpoint to signal to
      the load balancer that it's no longer accepting new traffic (requires https://github.com/elastic/kibana/issues/46984).
   2. Allows ungoing HTTP requests to complete with a configurable timeout
      before forcefully terminating any open connections.
   3. Closes any keep-alive sockets by sending a `connection: close` header. 
   4. Shutdown all plugins and Core services.
2. (recommended) Take a snapshot of all Kibana's Saved Objects indices. This simplifies doing a rollback to a simple snapshot restore, but is not required in order to do a rollback if a migration fails.
3. Start the upgraded Kibana nodes. All running Kibana nodes should be on the same version, have the same plugins enabled and use the same configuration.

To rollback to a previous version of Kibana with a snapshot
1. Shutdown all Kibana nodes.
2. Restore the Saved Object indices and aliases from the snapshot
3. Start the rollback Kibana nodes. All running Kibana nodes should be on the same rollback version, have the same plugins enabled and use the same configuration.

To rollback to a previous version of Kibana without a snapshot:
(Assumes the migration to 7.11.0 failed)
1. Shutdown all Kibana nodes.
2. Remove the index created by the failed Kibana migration by using the version-specific alias e.g. `DELETE /.kibana_7.11.0` 
3. Remove the write block from the rollback index using the `.kibana` alias
   `PUT /.kibana/_settings {"index.blocks.write": false}`
4. Start the rollback Kibana nodes. All running Kibana nodes should be on the same rollback version, have the same plugins enabled and use the same configuration.

### 4.2.1.4 Handling documents that belong to a disabled plugin
It is possible for a plugin to create documents in one version of Kibana, but then when upgrading Kibana to a newer version, that plugin is disabled. Because the plugin is disabled it cannot register it's Saved Objects type including the mappings or any migration transformation functions. These "orphan" documents could cause future problems:
 - A major version introduces breaking mapping changes that cannot be applied to the data in these documents.
 - Two majors later migrations will no longer be able to migrate this old schema and could fail unexpectadly when the plugin is suddenly enabled.

As a concrete example of the above, consider a user taking the following steps:
1. Installs Kibana 7.6.0 with spaces=enabled. The spaces plugin creates a default space saved object.
2. User upgrades to 7.10.0 but uses the OSS download which has spaces=disabled. Although the 7.10.0 spaces plugin includes a migration for space documents, the OSS release cannot migrate the documents or update it's mappings.
3. User realizes they made a mistake and use Kibana 7.10.0 with x-pack and the spaces plugin enabled. At this point we have a completed migration for 7.10.0 but there's outdated spaces documents with migrationVersion=7.6.0 instead of 7.10.0.

There are several approaches we could take to dealing with these orphan documents:

1. Start up but refuse to query on types with outdated documents until a user manually triggers a re-migration
   
   Advantages:
    - The impact is limited to a single plugin
    
   Disadvantages:
    - It might be less obvious that a plugin is in a degraded state unless you read the logs (not possible on Cloud) or view the `/status` endpoint.
    - If a user doesn't care that the plugin is degraded, orphan documents are carried forward indefinitely.
    - Since Kibana has started receiving traffic, users can no longer
      downgrade without losing data. They have to re-migrate, but if that
      fails they're stuck.
    - Introduces a breaking change in the upgrade behaviour

    To perform a re-migration:
      - Remove the `.kibana_7.10.0` alias
      - Take a snapshot OR set the configuration option `migrations.target_index_postfix: '002'` to create a new target index `.kibana_7.10.0_002` and keep the `.kibana_7.10.0_001` index to be able to perform a rollback.
      - Start up Kibana
  
2. Refuse to start Kibana until the plugin is enabled or it's data deleted

    Advantages:
    - Admin’s are forced to deal with the problem as soon as they disable a plugin

    Disadvantages:
    - Cannot temporarily disable a plugin to aid in debugging or to reduce the load a Kibana plugin places on an ES cluster.
    - Introduces a breaking change

3. Refuse to start a migration until the plugin is enabled or it's data deleted

    Advantages:
    - We force users to enable a plugin or delete the documents which prevents these documents from creating future problems like a mapping update not being compatible because there are fields which are assumed to have been migrated.
    - We keep the index “clean”.

    Disadvantages:
    - Since users have to take down outdated nodes before they can start the upgrade, they have to enter the downtime window before they know about this problem. This prolongs the downtime window and in many cases might cause an operations team to have to reschedule their downtime window to give them time to investigate the documents that need to be deleted. Logging an error on every startup could warn users ahead of time to mitigate this.
    - We don’t expose Kibana logs on Cloud so this will have to be escalated to support and could take 48hrs to resolve (users can safely rollback, but without visibility into the logs they might not know this). Exposing Kibana logs is on the cloud team’s roadmap.
    - It might not be obvious just from the saved object type, which plugin created these objects.
    - Introduces a breaking change in the upgrade behaviour

4. Use a hash of enabled plugins as part of the target index name
    Using a migration target index name like
    `.kibana_7.10.0_${hash(enabled_plugins)}_001` we can migrate all documents
    every time a plugin is enabled / disabled. 

    Advantages:
    - Outdated documents belonging to disabled plugins will be upgraded as soon
     as the plugin is enabled again.

    Disadvantages:
    - Disabling / enabling a plugin will cause downtime (breaking change).
    - When a plugin is enabled, disabled and enabled again our target index
      will be an existing outdated index which needs to be deleted and
      re-cloned. Without a way to check if the index is outdated, we cannot
      deterministically perform the delete and re-clone operation without
      coordination.

5. Transform outdated documents (step 8) on every startup
    Advantages:
    - Outdated documents belonging to disabled plugins will be upgraded as soon
     as the plugin is enabled again.

    Disadvantages:
    - Orphan documents are retained indefinitely so there's still a potential
      for future problems.
    - Slightly slower startup time since we have to query for outdated
      documents every time.

We prefer option (3) since it provides flexibility for disabling plugins in
the same version while also protecting users' data in all cases during an
upgrade migration. However, because this is a breaking change we will
implement (5) during 7.x and only implement (3) during 8.x.

# 5. Alternatives
## 5.1 Rolling upgrades
We considered implementing rolling upgrades to provide zero downtime
migrations. However, this would introduce significant complexity for plugins:
they will need to maintain up and down migration transformations and ensure
that queries match both current and outdated documents across all
versions. Although we can afford the once-off complexity of implementing
rolling upgrades, the complexity burden of maintaining plugins that support
rolling-upgrades will slow down all development in Kibana. Since a predictable
downtime window is sufficient for our users, we decided against trying to
achieve zero downtime with rolling upgrades. See "Rolling upgrades" in
https://github.com/elastic/kibana/issues/52202 for more information.

## 5.2 Single node migrations coordinated through a lease/lock
This alternative is a proposed algorithm for coordinating migrations so that
these only happen on a single node and therefore don't have the restrictions
found in [(4.2.1.1)](#4311-restrictions). We decided against this algorithm
primarily because it is a lot more complex, but also because it could still
require manual intervention to retry from certain unlikely edge cases.

<details>
  <summary>It's impossible to guarantee that a single node performs the
  migration and automatically retry failed migrations.</summary>
  
Coordination should ensure that only one Kibana node performs the migration at
a given time which can be achived with a distributed lock built on top of
Elasticsearch. For the Kibana cluster to be able to retry a failed migration,
requires a specialized lock which expires after a given amount of inactivity.
We will refer to such expiring locks as a "lease".

If a Kibana process stalls, it is possible that the process' lease has expired
but the process doesn't yet recognize this and continues the migration. To
prevent this from causing data loss each lease should be accompanied by a
"guard" that prevents all writes after the lease has expired. See
[how to do distributed
locking](https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html)
for an in-depth discussion.

Elasticsearch doesn't provide any building blocks for constructing such a guard.
</details>

However, we can implement a lock (that never expires) with strong
data-consistency guarantees. Because there’s no expiration, a failure between
obtaining the lock and releasing it will require manual intervention. Instead
of trying to accomplish the entire migration after obtaining a lock, we can
only perform the last step of the migration process, moving the aliases, with
a lock. A permanent failure in only this last step is not impossible, but very
unlikely.

### 5.2.1 Migration algorithm
1. Obtain a document lock (see [5.2.2 Document lock
   algorithm](#522-document-lock-algorithm)). Convert the lock into a "weak
   lease" by expiring locks for nodes which aren't active (see [4.2.2.4
   Checking for lease expiry](#4324-checking-for-lease-expiry)). This "weak
   lease" doesn't require strict guarantees since it's only used to prevent
   multiple Kibana nodes from performing a migration in parallel to reduce the
   load on Elasticsearch.
2. Migrate data into a new process specific index (we could use the process
   UUID that’s used in the lease document like
   `.kibana_3ef25ff1-090a-4335-83a0-307a47712b4e`).
3. Obtain a document lock (see [5.2.2 Document lock
   algorithm](#522-document-lock-algorithm)).
4. Finish the migration by pointing `.kibana` →
   `.kibana_3ef25ff1-090a-4335-83a0-307a47712b4e`. This automatically releases
   the document lock (and any leases) because the new index will contain an
   empty `kibana_cluster_state`.

If a process crashes or is stopped after (3) but before (4) the lock will have
to be manually removed by deleting the `kibana_cluster_state` document from
`.kibana` or restoring from a snapshot. 

### 5.2.2 Document lock algorithm
To improve on the existing Saved Objects migrations lock, a locking algorithm
needs to satisfy the following requirements:
- Must guarantee that only a single node can obtain the lock. Since we can
  only provide strong data-consistency guarantees on the document level in
  Elasticsearch our locking mechanism needs to be based on a document.
- Manually removing the lock
  - shouldn't have any risk of accidentally causing data loss.
  - can be done with a single command that's always the same (shouldn’t
    require trying to find `n` for removing the correct `.kibana_n` index).
- Must be easy to retrieve the lock/cluster state to aid in debugging or to
  provide visibility. 

Algorithm:
1. Node reads `kibana_cluster_state` lease document from `.kibana`
2. It sends a heartbeat every `heartbeat_interval` seconds by sending an
   update operation that adds it’s UUID to the `nodes` array and sets the
   `lastSeen` value to the current local node time. If the update fails due to
   a version conflict the update operation is retried after a random delay by
   fetching the document again and attempting the update operation once more.
3. To obtain a lease, a node:
    1. Fetches the `kibana_cluster_state` document
    2. If all the nodes’ `hasLock === false` it sets it’s own `hasLock` to
       true and attempts to write the document. If the update fails
       (presumably because of another node’s heartbeat update) it restarts the
       process to obtain a lease from step (3).
    3. If another nodes’ `hasLock === true` the node failed to acquire a
       lock and waits until the active lock has expired before attempting to
       obtain a lock again. 
4. Once a node is done with its lock, it releases it by fetching and then
   updating `hasLock = false`. The fetch + update operations are retried until
   this node’s `hasLock === false`.

Each machine writes a `UUID` to a file, so a single machine may have multiple
processes with the same Kibana `UUID`, so we should rather generate a new UUID
just for the lifetime of this process. 

`KibanaClusterState` document format:
```js
  nodes: {
    "852bd94e-5121-47f3-a321-e09d9db8d16e": {
      version: "7.6.0",
      lastSeen: [ 1114793, 555149266 ], // hrtime() big int timestamp
      hasLease: true,
      hasLock: false,
    },
    "8d975c5b-cbf6-4418-9afb-7aa3ea34ac90": {
      version: "7.6.0",
      lastSeen: [ 1114862, 841295591 ],
      hasLease: false,
      hasLock: false,
    },
    "3ef25ff1-090a-4335-83a0-307a47712b4e": {
      version: "7.6.0",
      lastSeen: [ 1114877, 611368546 ],
      hasLease: false,
      hasLock: false,
    },
  },
  oplog: [
    {op: 'ACQUIRE_LOCK', node: '852bd94e...', timestamp: '2020-04-20T11:58:56.176Z'}
  ]
}
```

### 5.2.3 Checking for "weak lease" expiry
The simplest way to check for lease expiry is to inspect the `lastSeen` value.
If `lastSeen + expiry_timeout > now` the lock is considered expired. If there
are clock drift or daylight savings time adjustments, there’s a risk that a
node loses it’s lease before `expiry_timeout` has occurred. Since losing a
lock prematurely will not lead to data loss it’s not critical that the
expiry time is observed under all conditions.

A slightly safer approach is to use a monotonically increasing clock
(`process.hrtime()`) and relative time to determine expiry. Using a
monotonically increasing clock guarantees that the clock will always increase
even if the system time changes due to daylight savings time, NTP clock syncs,
or manually setting the time. To check for expiry, other nodes poll the
cluster state document. Once they see that the `lastSeen` value has increased,
they capture the current hr time `current_hr_time` and starts waiting until
`process.hrtime() - current_hr_time > expiry_timeout` if at that point
`lastSeen` hasn’t been updated the lease is considered to have expired. This
means other nodes can take up to `2*expiry_timeout` to recognize an expired
lease, but a lease will never expire prematurely. 

Any node that detects an expired lease can release that lease by setting the
expired node’s `hasLease = false`. It can then attempt to acquire its lease.

## 5.3 Minimize data loss with mixed Kibana versions during 7.x
When multiple versions of Kibana are running at the same time, writes from the
outdated node can end up either in the outdated Kibana index, the newly
migrated index, or both. New documents added (and some updates) into the old
index while a migration is in-progress will be lost. Writes that end up in the
new index will be in an outdated format. This could cause queries on the data
to only return a subset of the results which leads to incorrect results or
silent data loss.

Minimizing data loss from mixed 7.x versions, introduces two additional steps
to rollback to a previous version without a snapshot:
1. (existing) Point the `.kibana` alias to the previous Kibana index `.kibana_n-1`
2. (existing) Delete `.kibana_n`
3. (new) Enable writes on `.kibana_n-1`
4. (new) Delete the dummy "version lock" document from `.kibana_n-1`

Since our documentation and server logs have implicitly encouraged users to
rollback without using snapshots, many users might have to rely on these
additional migration steps to perform a rollback. Since even the existing
steps are error prone, introducing more steps will likely introduce more
problems than what it solves. 

1. All future versions of Kibana 7.x will use the `.kibana_saved_objects`
  alias to locate the current index. If `.kibana_saved_objects` doesn't
  exist, newer versions will fallback to reading `.kibana`.
2. All future versions of Kibana will locate the index that
    `.kibana_saved_objects` points to and then read and write directly from
    the _index_ instead of the alias.
3. Before starting a migration:
  1. Write a new dummy "version lock" document to the `.kibana` index with a
    `migrationVersion` set to the current version of Kibana. If an outdated
    node is started up after a migration was started it will detect that
    newer documents are present in the index and refuse to start up.
  2. Set the outdated index to read-only. Since `.kibana` is never advanced,
    it will be pointing to a read-only index which prevent writes from
    6.8+ releases which are already online.

## 5.4 In-place migrations that re-use the same index (8.0)
> We considered an algorithm that re-uses the same index for migrations and an approach to minimize data-loss if our upgrade procedures aren't followed. This is no longer our preferred approach because of several downsides:
>  - It requires taking snapshots to prevent data loss so we can only release this in 8.x
>  - Minimizing data loss with unsupported upgrade configurations adds significant complexity and still doesn't guarantee that data isn't lost.

### 5.4.1 Migration algorithm (8.0):
1. Exit Kibana with a fatal error if a newer node has started a migration by
   checking for:
   1. Documents with a newer `migrationVersion` numbers.
2. If the mappings are out of date, update the mappings to the combination of
   the index's current mappings and the expected mappings.
3. If there are outdated documents, migrate these in batches:
   1. Read a batch of outdated documents from the index.
   2. Transform documents by applying the migration transformation functions.
   3. Update the document batch in the same index using optimistic concurrency
      control. If a batch fails due to an update version mismatch continue
      migrating the other batches.
   4. If a batch fails due other reasons repeat the entire migration process.
4. If any of the batches in step (3.3) failed, repeat the entire migration
   process. This ensures that in-progress bulk update operations from an
   outdated node won't lead to unmigrated documents still being present after
   the migration.
5. Once all documents are up to date, the migration is complete and Kibana can
   start serving traffic.

Advantages:
- Not duplicating all documents into a new index will speed up migrations and
  reduce the downtime window. This will be especially important for the future
  requirement to support > 10k or > 100k documents.
- We can check the health of an existing index before starting the migration,
  but we cannot detect what kind of failures might occur while creating a new
  index. Whereas retrying migrations will eventually recover from the errors
  in (3.3), re-using an index allows us to detect these problems before trying
  and avoid errors like (3.3.1) altogether.
- Single index to backup instead of “index pattern” that matches any
  `.kibana_n`.
- Simplifies Kibana system index Elasticsearch plugin since it needs to work
  on one index per "tenant".
- By leveraging optimistic concurrency control we can further minimize data
  loss for unsupported upgrade configurations in the future.

Drawbacks:
- Cannot make breaking mapping changes (even though it was possible, we have not
  introduced a breaking mapping change during 7.x).
- Rollback is only possible by restoring a snapshot which requires educating
  users to ensure that they don't rely on `.kibana_n` indices as backups.
  (Apart from the need to educate users, snapshot restores provide many
  benefits).
- It narrows the second restriction under (4.2.1) even further: migrations
  cannot rely on any state that could change as part of a migration because we
  can no longer use the previous index as a snapshot of unmigrated state.
- We can’t automatically perform a rollback from a half-way done migration.
- It’s impossible to provide read-only functionality for outdated nodes which
  means we can't achieve goal (2.7).

### 5.4.2 Minimizing data loss with unsupported upgrade configurations (8.0)
> This alternative can reduce some data loss when our upgrade procedure isn't
> followed with the algorithm in (5.4.1).

Even if (4.5.2) is the only supported upgrade procedure, we should try to
prevent data loss when these instructions aren't followed.

To prevent data loss we need to prevent any writes from older nodes. We use
a version-specific alias for this purpose. Each time a migration is started,
all other aliases are removed. However, aliases are stored inside
Elasticsearch's ClusterState and this state could remain inconsistent between
nodes for an unbounded amount of time. In addition, bulk operations that were
accepted before the alias was removed will continue to run even after removing
the alias.

As a result, Kibana cannot guarantee that there would be no data loss but
instead, aims to minimize it as much as possible by adding the bold sections
to the migration algorithm from (5.4.1)

1. **Disable `action.auto_create_index` for the Kibana system indices.**
2. Exit Kibana with a fatal error if a newer node has started a migration by
   checking for:
   1. **Version-specific aliases on the `.kibana` index with a newer version.**
   2. Documents with newer `migrationVersion` numbers.
3. **Remove all other aliases and create a new version-specific alias for
   reading and writing to the `.kibana` index .e.g `.kibana_8.0.1`. During and
   after the migration, all saved object reads and writes use this alias
   instead of reading or writing directly to the index. By using the atomic
   `POST /_aliases` API we minimize the chance that an outdated node creating
   new outdated documents can cause data loss.**
4. **Wait for the default bulk operation timeout of 30s. This ensures that any
   bulk operations accepted before the removal of the alias have either
   completed or returned a timeout error to it's initiator.**
5. If the mappings are out of date, update the mappings **through the alias**
   to the combination of the index's current mappings and the expected
   mappings. **If this operation fails due to an index missing exception (most
   likely because another node removed our version-specific alias) repeat the
   entire migration process.**
6. If there are outdated documents, migrate these in batches:
   1. Read a batch of outdated documents from `.kibana_n`.
   2. Transform documents by applying the migration functions.
   3. Update the document batch in the same index using optimistic concurrency
      control. If a batch fails due to an update version mismatch continue
      migrating the other batches.
   4. If a batch fails due other reasons repeat the entire migration process.
7. If any of the batches in step (6.3) failed, repeat the entire migration
   process. This ensures that in-progress bulk update operations from an
   outdated node won't lead to unmigrated documents still being present after
   the migration.
8. Once all documents are up to date, the migration is complete and Kibana can
   start serving traffic.

Steps (2) and (3) from the migration algorithm in minimize the chances of the
following scenarios occuring but cannot guarantee it. It is therefore useful
to enumarate some scenarios and their worst case impact:
1. An outdated node issued a bulk create to it's version-specific alias.
   Because a user doesn't wait for all traffic to drain a newer node starts
   it's migration before the bulk create was complete. Since this bulk create
   was accepted before the newer node deleted the previous version-specific
   aliases, it is possible that the index now contains some outdated documents
   that the new node is unaware of and doesn't migrate. Although these outdated
   documents can lead to inconsistent query results and data loss, step (4)
   ensures that an error will be returned to the node that created these
   objects.
2. A 8.1.0 node and a 8.2.0 node starts migrating a 8.0.0 index in parallel.
   Even though the 8.2.0 node will remove the 8.1.0 version-specific aliases,
   the 8.1.0 node could have sent an bulk update operation that got accepted
   before its alias was removed. When the 8.2.0 node tries to migrate these
   8.1.0 documents it gets a version conflict but cannot be sure if this was
   because another node of the same version migrated this document (which can
   safely be ignored) or interference from a different Kibana version. The
   8.1.0 node will hit the error in step (6.3) and restart the migration but
   then ultimately fail at step (2). The 8.2.0 node will repeat the entire
   migration process from step (7) thus ensuring that all documents are up to
   date.
3. A race condition with another Kibana node on the same version, but with
   different enabled plugins caused this node's required mappings to be
   overwritten. If this causes a mapper parsing exception in step (6.3) we can
   restart the migration. Because updating the mappings is additive and saved
   object types are unique to a plugin, restarting the migration will allow
   the node to update the mappings to be compatible with node's plugins. Both
   nodes will be able to successfully complete the migration of their plugins'
   registered saved object types. However, if the migration doesn't trigger a
   mapper parsing exception the incompatible mappings would go undetected
   which can cause future problems like write failures or inconsistent query
   results.

## 5.5 Tag objects as “invalid” if their transformation fails
> This alternative prevents a failed migration when there's a migration transform function bug or a document with invalid data. Although it seems preferable to not fail the entire migration because of a single saved object type's migration transform bug or a single invalid document this has several pitfalls:
>  1. When an object fails to migrate the data for that saved object type becomes inconsistent. This could load to a critical feature being unavailable to a user leaving them with no choice but to downgrade.
>  2. Because Kibana starts accepting traffic after encountering invalid objects a rollback will lead to data loss leaving users with no clean way to recover.
> As a result we prefer to let an upgrade fail and making it easy for users to rollback until they can resolve the root cause.

> Achieves goals: (2.2)
> Mitigates Errors (3.1), (3.2)

1. Tag objects as “invalid” if they cause an exception when being transformed,
   but don’t fail the entire migration. 
2. Log an error message informing administrators that there are invalid
   objects which require inspection. For each invalid object, provide an error
   stack trace to aid in debugging. 
3. Administrators should be able to generate a migration report (similar to
   the one dry run migrations create) which is an NDJSON export of all objects
   tagged as “invalid”.
   1. Expose this as an HTTP API first
   2. (later) Notify administrators and allow them to export invalid objects
      from the Kibana UI.
4. When an invalid object is read, the Saved Objects repository will throw an
   invalid object exception which should include a link to the documentation
   to help administrators resolve migration bugs.
5. Educate Kibana developers to no longer simply write back an unmigrated
   document if an exception occurred. A migration function should either
   successfully transform the object or throw. 

# 6. How we teach this
1. Update documentation and server logs to start educating users to depend on
   snapshots for Kibana rollbacks.
2. Update developer documentation and educate developers with best practices
   for writing migration functions. 

# 7. Unresolved questions
1. When cloning an index we can only ever add new fields to the mappings. When
   a saved object type or specific field is removed, the mappings will remain
   until we re-index. Is it sufficient to only re-index every major? How do we
   track the field count as it grows over every upgrade?
2. More generally, how do we deal with the growing field count approaching the
   default limit of 1000?
