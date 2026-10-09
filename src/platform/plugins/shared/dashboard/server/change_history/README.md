# Dashboard change history

Dashboard versions are recorded with `@kbn/change-history` (`module: dashboard`, `dataset: dashboards`, `objectType: dashboard`).

## Sequence policy

Each dashboard saved object stores a `historySequence` attribute, and every history event stores the same number as `object.sequence`. The UI shows it as the version number (`v{n}`), and the history client orders events by it (newest first), falling back to `@timestamp` and `event.id`.

- **Create**: starts at `INITIAL_HISTORY_SEQUENCE` (`1`).
- **Update**: `getNextHistorySequence` increments the existing sequence by one only when the stored content (attributes without `historySequence`, or references) changed. Otherwise the sequence is preserved, and no new history event is written.
- **Legacy dashboards** (no `historySequence`): the first update sets the sequence to `INITIAL_HISTORY_SEQUENCE`.
- **Restore**: is a regular update with the restored snapshot, so it creates a _new_ version rather than rewinding. The event stores `metadata.restoredFrom` (the restored version).
- **Concurrency**: updates send the saved object `version` (optimistic concurrency control). A concurrent writer therefore gets a 409 instead of writing a duplicate sequence number.
- **Best effort**: the history write happens after the saved object write. A failed history write is swallowed and does not fail the save, so a version number can be missing from history, but it is never reused.

## Event metadata

- `restoredFrom`: version that was restored (restore only).
- `changeCount`: number of changes compared with the previous version, computed once at write time.
