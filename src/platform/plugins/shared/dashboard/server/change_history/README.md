# Dashboard change history

Dashboard versions are recorded with `@kbn/change-history` (`module: dashboard`, `dataset: dashboards`, `objectType: dashboard`).

## Sequence policy

Every history event stores its version as `object.sequence`. The UI shows it as the version number (`v{n}`), and the history client orders events by it (newest first), falling back to `@timestamp` and `event.id`. The dashboard saved object stores the latest sequence as `historySequence`, and every versioned write continues from it (`getNextHistorySequence`). When it is absent (a new dashboard, or one saved before it existed), the next sequence is the latest history sequence plus one (`getHistorySequences`), or `INITIAL_HISTORY_SEQUENCE` (`1`) when there is no history.

- **Create**: deleting a dashboard does not delete its history, so a dashboard created with an explicit ID that still has history continues from the latest existing sequence + 1, keeping new versions ordered above the deleted dashboard's. The sequence is stored on the new saved object.
- **Update**: a new version is recorded only when the stored content (attributes or references) changed (`hasContentChanged`). Otherwise, no history event is written and the stored `historySequence` is carried over unchanged (updates replace attributes, and `hasContentChanged` ignores `historySequence`).
- **Delete**: recorded as a `dashboard_delete` event with the next sequence, like any other version, so a dashboard recreated with the same ID continues after it. The event waits for the index refresh so that a recreate reads it. Saved object deletes take no version check, so an update racing a delete can still share a sequence.
- **Restore**: is a regular update with the restored snapshot, so it creates a _new_ version rather than rewinding. The event stores `metadata.restoredFrom` (the restored version).
- **Concurrency**: updates send the saved object `version` (optimistic concurrency control). A concurrent writer therefore gets a 409 before it can write a version, and because `historySequence` is stored in the same write, two saves can never share a sequence, regardless of when the history index refreshes.
- **Best effort**: the history write happens after the saved object write. A failed history write is swallowed and does not fail the save, so that change has no version, and the next change reuses its number. If history cannot be read, the sequence restarts at `INITIAL_HISTORY_SEQUENCE`.

## Event metadata

- `restoredFrom`: version that was restored (restore only).
- `changeCount`: number of changes compared with the previous version, computed once at write time.
