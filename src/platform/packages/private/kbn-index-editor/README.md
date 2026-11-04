# @kbn/index-editor

This package provides a comprehensive UI for creating and editing indices through an interactive flyout interface. It supports standard indices and lookup indices, selected through the `indexMode` of the open context.

## Features

- **Index Editor Flyout**: A modal interface for creating and editing index content.
- **File Upload Support**: Upload CSV to populate indices from scratch or append data to an existing index.
- **Interactive Data Grid**: Edit index data using a table-like interface.
- **UI Actions Integration**: Integrates with Kibana's UI actions system for triggering the editor.

## Modes & behavior

### Index mode

The editor can operate on either a `standard` or a `lookup` index, controlled by the `indexMode` field
of the open context (defaults to `standard`). The index mode only affects index creation/recreation;
editing existing documents is mode-agnostic. The destructive "Reset index" action is available only for
lookup indices.

### Editability pre-flight

When opening an **existing** index for editing, a caller's view of that index can be stale or coarse, so
the open action resolves the name server-side (`INDEX_EDITOR_RESOLVE_ROUTE`) and applies a small policy
(`assessIndexEditability`) before opening the flyout. When the target is not editable, a toast explains
why and the flyout does not open. The policy rejects:

- **Aliases and data streams** — the editor targets a concrete index, so these are never editable; open
  the underlying index instead.
- **Closed or frozen indices** — not writable until reopened/unfrozen.
- **Routing-required indices** — the editor writes by `_id` without routing, which an index whose
  mapping marks `_routing` as required rejects. Detected via a best-effort metadata lookup; only the
  declared `required` flag is caught (optional per-document custom routing cannot be detected up
  front and still surfaces at save time).
- **Unsupported index modes** — `standard` mode accepts only a plain index (no explicit mode), and
  `lookup` mode accepts only a `lookup` index. Other modes (e.g. `logsdb`, `time_series`) are rejected.
  This catches modes that the autocomplete sources list cannot distinguish by `type` alone.
- **Disabled or synthetic `_source`** — editing round-trips documents through `_source`, so an index
  with `_source` disabled (nothing to read back) or synthetic (reconstructed on read, so writes could
  silently alter stored values) is rejected. Detected via the same best-effort metadata lookup, which
  reads the `_source` mapping and the `index.mapping.source.mode` setting.
- **Missing indices** — a name that no longer resolves to an index.

Runtime fields are not a reason to reject the whole index: they are a per-field concern, since the rest
of the index stays editable. The resolve route reports the index's runtime field names (read from
`mappings.runtime` in the same best-effort metadata lookup), and the grid renders only those columns
read-only — their values are computed at query time, so edits would never persist.

Creation is not gated by this pre-flight: the index name is an editable prefill, so a name collision
(including with a closed/hidden index the suggestion list omits) is reported at save time by the create
request instead.

Resolution is best-effort: if the resolve call cannot be completed, the editor proceeds and relies on the
save-time error callout as a safety net. Conditions that are not cheap to detect up front — e.g. write
blocks or read-only/searchable-snapshot indices — are likewise surfaced at save time rather than in the
pre-flight.

Cross-cluster references (names containing `:`) are out of scope: the FROM-command badge only offers
editing for single, concrete, local index names and skips remote/wildcard patterns.

### Flyout behavior

Depending on how the flyout is opened:

#### Create mode

- Start from an empty state: define columns and add rows manually or upload files.
- The entire flyout acts as a file drop zone.

#### Edit mode

- Edit any document in the table.
- Add new columns and rows.
- Upload files to append documents.

#### View mode

- Disabled actions:
  - File upload and drag-and-drop
  - Inline editing in the data grid

## Permissions & visibility

Actions are gated by:

- Write privileges (edit).
- Read-only with `view_index_metadata` (view).
- Create-index privileges on the pattern (create).

## Usage

### Basic Integration

```typescript
import { registerIndexEditorActions } from '@kbn/index-editor';
import type { EditIndexFlyoutDeps } from '@kbn/index-editor';

// Register the index editor telemetry events inside setup
registerIndexEditorAnalyticsEvents(core.analytics);

// Register the index editor actions with required dependencies
const deps: EditIndexFlyoutDeps = {
  coreStart,
  data,
  uiActions,
  fieldFormats,
  share,
  fileUpload,
};

registerIndexEditorActions(deps);
```

### Triggering the Index Editor in edit mode

```typescript
import { ACTION_EDIT_INDEX } from '@kbn/index-editor';
import type { EditIndexContentContext } from '@kbn/index-editor';

// Create context for the index editor
const context: EditIndexContentContext = {
  indexName: 'my-index',
  doesIndexExist: true,
  canEditIndex: true,
  indexMode: 'standard', // 'standard' (default) or 'lookup'
  triggerSource: 'your_source', // Used only for telemetry
  onClose: (result) => {
    console.log('Index editor closed:', result);
  },
};

// Trigger the index editor flyout
await uiActions.executeTriggerActions('EDIT_INDEX_CONTENT_TRIGGER_ID', context);
```

### Triggering the Index Editor in creation mode

The invocation is the same, but you have to set `doesIndexExist` to `false`.
You can provide or not an `indexName`, if provided it will prefill the index name input with it.
