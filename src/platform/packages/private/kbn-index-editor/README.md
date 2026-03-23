# @kbn/index-editor

This package provides a comprehensive UI for creating and editing lookup indexes through an interactive flyout interface.

## Features

- **Index Editor Flyout**: A modal interface for creating and editing lookup index content.
- **File Upload Support**: Upload CSV to populate indices from scratch or append data to an existing index.
- **Interactive Data Grid**: Edit index data using a table-like interface.
- **UI Actions Integration**: Integrates with Kibana's UI actions system for triggering the editor.

## Modes & behavior

Depending on how the flyout is opened:

### Create mode

- Start from an empty state: define columns and add rows manually or upload files.
- The entire flyout acts as a file drop zone.

### Edit mode

- Edit any document in the table.
- Add new columns and rows.
- Upload files to append documents.

### View mode

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
import { registerIndexEditorActions, EDIT_LOOKUP_INDEX_CONTENT_TRIGGER } from '@kbn/index-editor';
import type { EditLookupIndexFlyoutDeps } from '@kbn/index-editor';

// Register the index editor telemetry events inside setup
registerIndexEditorAnalyticsEvents(core.analytics);

// Register the index editor actions with required dependencies
const deps: EditLookupIndexFlyoutDeps = {
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
import { EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID, ACTION_EDIT_LOOKUP_INDEX } from '@kbn/index-editor';
import type { EditLookupIndexContentContext } from '@kbn/index-editor';

// Create context for the index editor
const context: EditLookupIndexContentContext = {
  indexName: 'my-lookup-index',
  doesIndexExist: true,
  canEditIndex: true,
  triggerSource: 'your_source', // Used only for telemetry
  onClose: (result) => {
    console.log('Index editor closed:', result);
  },
};

// Trigger the index editor flyout
await uiActions.executeTriggerActions('EDIT_LOOKUP_INDEX_CONTENT_TRIGGER_ID', context);
```

### Triggering the Index Editor in creation mode

The invocations is the same, but you have to set `doesIndexExist` to `false`.
You can provide or not an `indexName`, if provided it will prefill the index name input with it.
