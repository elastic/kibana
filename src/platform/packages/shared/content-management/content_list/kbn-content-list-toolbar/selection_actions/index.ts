/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// ========================================
// PUBLIC API - Marker Components & Types
// ========================================

/**
 * SelectionActions container component and SelectionAction sub-components.
 *
 * @example
 * ```tsx
 * const { SelectionActions, SelectionAction } = ContentListToolbar;
 *
 * <ContentListToolbar>
 *   <SelectionActions>
 *     <SelectionAction.Delete />
 *     <SelectionAction.Export />
 *     <SelectionAction id="archive" label="Archive" onSelect={handleArchive} />
 *   </SelectionActions>
 * </ContentListToolbar>
 * ```
 */
export { SelectionActions, type SelectionActionsProps } from './selection_actions';
export { SelectionAction, type SelectionActionProps } from './selection_action';

// Known action marker components (also available via SelectionAction.Delete, etc.).
export { DeleteAction, type DeleteActionProps, type DeleteActionConfig } from './delete';
export { ExportAction, type ExportActionProps, type ExportActionConfig } from './export';

// Selection action builder config type.
export { type SelectionActionConfig } from './selection_action_builder';

// Shared types.
export {
  KNOWN_ACTION_IDS,
  type KnownActionId,
  type BaseActionProps,
  type ActionBuilderContext,
  type ActionBuildResult,
  type ActionBuilder,
} from './types';

// ========================================
// INTERNAL EXPORTS (for package use only)
// ========================================

// Parsing utilities.
export {
  parseSelectionActionsFromChildren,
  isKnownActionId,
  type ActionDescriptor,
  type ActionConfig,
} from './parse_children';

// Building utilities.
export {
  SelectionActionsRenderer,
  buildActionsFromConfig,
  type SelectionActionsRendererProps,
} from './build_actions';

// Individual action builders (for advanced usage).
export { buildDeleteAction, parseDeleteActionProps } from './delete';
export { buildExportAction, parseExportActionProps } from './export';
export {
  buildAction as buildSelectionAction,
  parseProps as parseSelectionActionProps,
} from './selection_action_builder';
