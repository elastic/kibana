# v3 saved objects migration algorithm

v3 merges the `v2` (classic) and `zdt` (Serverless) algorithms into a single state machine.
It is selected with `migrations.algorithm: v3`.

Like `zdt`, v3 updates the system indices **in place**: it never reindexes. The mappings are
updated with additive changes only, and the documents are converted with the model versions of
their types. Like `v2`, it runs on classic deployments, where it can upgrade the indices that `v2`
last wrote.

## Classic and Serverless profiles

The deployment flavour is detected from `esCapabilities.serverless`. It doesn't select a different
algorithm: it derives a few boolean inputs of the immutable `MigrationContext`
(see `deriveMigrationInputs` in `context.ts`).

| Input | Classic | Serverless |
| --- | --- | --- |
| `allowDowngrade` (accept an older Kibana version, and leave an index with newer model versions untouched) | no: FATAL | yes |
| `removeOutdatedVersionAliases` | yes | no |
| `checkClusterRoutingAllocation` | yes | no (`_cluster/settings` isn't available) |
| `fetchAllocationExplain` (on yellow timeouts) | yes | no |
| `waitForMigrationCompletion` | on background-tasks-only nodes | no |
| `migrateDocuments` | unless the node waits | if one of the node roles is in `migrations.zdt.runOnRoles` |

On classic, the background-tasks-only nodes wait for another Kibana instance to complete the
migration (`WAIT_FOR_MIGRATION_COMPLETION`). Unlike `v2`, which releases them as soon as the version
alias is added, they wait until `_meta.docVersions` are up to date, i.e. until every document has
been converted.
On Serverless, the nodes that don't run the document conversion (e.g. UI nodes) update the index
state (mappings and aliases) and then stop.

## The state graph

Each state lives in its own file under `steps/`. A step file exports:

- `Name`: the state's discriminant (`controlState`).
- `State`: the state's type.
- `step(state, io, context)`: returns `{ action, transition }`. The `action` performs the IO and
  returns a fact (a discriminated `Response`); the `transition` is a pure function of that fact.

`successors.ts` is the source of truth for the graph:

- `SUCCESSORS` lists the legal transitions of every state. Each `transition` is typed with its own
  row (`SuccessorsOf<typeof Name>`), so a transition to an unlisted state is a compile error.
- `STEPS` maps every non-terminal state to its step. Use cmd+click on a state name to navigate.
- `successors.test.ts` checks that every state is reachable and can terminate, and snapshots the
  graph: reviewing a change to the graph means reviewing that snapshot.

The states fall in three phases:

1. **Init**: `INIT` fetches the indices and runs `evaluateIndex` (`evaluate_index.ts`), a pure
   function that decides whether to create, update, wait or fail. A fresh index goes through
   `CHECK_CLUSTER_ROUTING_ALLOCATION` (classic only) and `CREATE_TARGET_INDEX`, which ends the
   migration: the new index already has the current mappings and `_meta`. Concurrent creators are
   safe: `index_already_exists` goes back to `INIT`.
2. **Index state**: `WAIT_FOR_YELLOW_SOURCE`, `UPDATE_INDEX_MAPPINGS` (and its task),
   `UPDATE_MAPPING_MODEL_VERSIONS`, `UPDATE_ALIASES` and `INDEX_STATE_UPDATE_DONE`.
   The mappings update picks up the documents of the types whose mappings changed, or all of them
   if a root field changed. It skips the outdated documents, which the documents phase rewrites anyway.
3. **Documents**: `CLEANUP_UNKNOWN_AND_EXCLUDED_DOCS` (and its task and refresh), then the
   `OUTDATED_DOCUMENTS_SEARCH_*` loop over a point-in-time, and `UPDATE_DOCUMENT_MODEL_VERSIONS`.

`_meta` is updated with a read-modify-write, so the fields written by `zdt` (e.g. `migrationState`)
are preserved. The versions are never lowered: if a newer Kibana raised them since `INIT`, the same
policy as `INIT` applies (FATAL on classic, the index is left untouched on Serverless). Elasticsearch
has no compare-and-swap on mappings, so two writes within the same few milliseconds can still lose
one another; this only causes idempotent work to be repeated.

## What `evaluateIndex` decides

`evaluateIndex` only considers the indices of its own prefix (`.kibana`, `.kibana_N` and the
indices aliased by `.kibana` or `.kibana_x.y.z`). Then:

- No index: create it, or wait when the node waits.
- An index without `_meta.mappingVersions` or version aliases (written before model versions), or a
  concrete index named like the alias: FATAL.
- An index with a write block, left by an older Kibana whose reindex migration didn't complete: FATAL,
  before writing anything.
- A Kibana version older than `minimumPreviousVersion`: FATAL.
- A newer Kibana version alias: FATAL on classic. On Serverless it is accepted, and the model
  versions decide what follows.
- Inconsistent model versions (some newer, some older): FATAL.
- Newer model versions (in `mappingVersions` or `docVersions`): FATAL on classic, the index is left
  untouched on Serverless.
- Otherwise: update the mappings if they are outdated, add the aliases, and, if the documents model
  versions (`_meta.docVersions`) are outdated, clean up the unknown and excluded documents and
  convert the outdated ones. As in zdt, a Kibana upgrade without model version changes in an index
  doesn't clean it up.

On classic deployments, the aliases update atomically adds the version alias and removes the older
ones with `must_exist`. If another instance changed them since `INIT` read them, the update fails and
the index is evaluated again: a newer Kibana is then detected, and this instance stops (FATAL).

The aliases are updated before the documents are converted, so the version alias doesn't prove that
the migration completed:

- `_meta.docVersions` are written last: an instance that crashes during the cleanup or the
  conversion leaves them outdated, and the next instance runs both again.

Documents of unknown types are kept, with a warning, unless `migrations.discardUnknownObjects` is
set to the current Kibana version. Corrupt documents and transform errors are FATAL unless
`migrations.discardCorruptObjects` is set to the current Kibana version.

Rolling back model versions within a Kibana version is a Serverless concern: `v2` ignores older
model versions, but v3 rejects them on classic deployments.

## Retries and invariants

- `retry(state, message, maxAttempts)` self-loops with an exponential delay (2s to 64s), then FATALs.
- `poll(state, message)` self-loops with the same delay, without a limit, while a condition isn't met:
  the `*_WAIT_FOR_TASK` states while their task runs, and `OUTDATED_DOCUMENTS_SEARCH_BULK_INDEX` on
  unavailable shards. Polls have their own counter (`pollCount`), so a long wait doesn't use up the
  retry budget of the failures.
- `WAIT_FOR_MIGRATION_COMPLETION` checks the index again every 2 seconds, without a limit.
- Successful transitions call `resetRetry`, which resets both counters.
- `invariants.ts` checks that every transition is listed in `SUCCESSORS`, and that every state,
  before its step runs and once terminal, is consistent (e.g. the retry counters are within
  bounds, the current batch exists). A violation is a bug and throws.

## On-demand migrations

Two `KibanaMigrator` methods run v3 against the given Elasticsearch client while Kibana is
running, e.g. for the system indices of a new tenant:

- `initialize({ client, esCapabilities })` creates the missing indices. On existing indices, it only
  adds the new mappings and updates the aliases: it doesn't pick up the mappings, update
  `_meta.mappingVersions`, clean up or convert documents (`migrateDocuments` and
  `pickupUpdatedMappings` are off). As `mappingVersions` stay outdated, the next migration picks up
  the mappings.
- `migrate({ client, esCapabilities })` does everything: it also picks up the updated mappings,
  cleans up the unknown and excluded documents and converts the outdated ones.

Unlike `runMigrations`, they never wait for another instance (they are explicit requests, whatever
the node roles), use the given client with the migration client options (no client retries, long
request timeout), are not memoised and don't emit on `status$`: deduplicating calls is up to the
caller. Both resolve once the migration completes, and reject if it fails. They are safe to run
concurrently with other migrators, as every step is idempotent.

## Testing

- Unit tests: `node scripts/jest src/core/packages/saved-objects/migration-server-internal/src/v3`.
  `test_helpers/` provides a real type registry and document migrator (`createTestContext`), and an
  IO stub describing a healthy cluster (`createIOStub`).
- Integration tests: `node scripts/jest_integration src/core/packages/core/server/integration_tests/saved_objects/migrations/v3`.
  They cover upgrades from `v2` archives, switching between `v2`, `zdt` and v3, both profiles and
  concurrent migrators. On Serverless, the index is created without shards and replicas settings,
  so it never turns green on a single-node stateful Elasticsearch: the Serverless index creation is
  tested in `src/core/packages/core/server/integration_tests/saved_objects/serverless/migrations/v3_basic_document_migration.test.ts`.
- `node scripts/check_saved_objects --algorithm v3` (or `all`) runs the automated rollback tests.
