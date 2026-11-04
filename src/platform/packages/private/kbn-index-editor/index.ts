/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { ACTION_EDIT_INDEX, registerIndexEditorActions } from './src/ui_action';

export { registerIndexEditorAnalyticsEvents } from './src/telemetry/events_registration';

export type {
  EditIndexContentContext,
  EditIndexFlyoutDeps,
  IndexEditorIndexMode,
} from './src/types';

/**
 * Editable-grid primitives reused by hosts (e.g. Discover ES|QL edit mode) that layer inline cell
 * editing onto a `UnifiedDataTable` without duplicating the index editor's cell UI.
 */
export {
  getCellValueRenderer,
  type CellEditTrigger,
} from './src/components/grid_custom_renderers/cell_value_renderer';
export {
  getValueInputPopover,
  type OnCellValueChange,
} from './src/components/grid_custom_renderers/value_input_popover';
export {
  getInputComponentForType,
  type ValueInputProps,
} from './src/components/value_inputs_factory';
export { parsePrimitive } from './src/utils';
export { bulkUpdate, type BulkUpdateOperations } from './src/services/bulk_update_service';
export type { AddDocAction, DeleteDocAction, DocUpdate } from './src/types';
