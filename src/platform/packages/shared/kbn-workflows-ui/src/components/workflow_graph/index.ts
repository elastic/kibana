/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The canvas loads lazily through one shared chunk; see `lazy_workflow_graph_canvas.tsx`.
export type { WorkflowGraphCanvasProps } from './workflow_graph_canvas';
export type { RenderStepIcon } from './workflow_graph_actions_context';
export { ReactFlowProvider } from '@xyflow/react';
export {
  WorkflowDetailBottomBar,
  type WorkflowDetailBottomBarProps,
  type WorkflowDetailBottomBarView,
  type ToolMenuItemDef,
  useWorkflowBottomBarState,
} from './workflow_graph_bottom_bar';
export {
  WorkflowVisualEditorFlyout,
  type WorkflowVisualEditorFlyoutProps,
  type WorkflowVisualEditorFlyoutTarget,
} from './workflow_visual_editor_flyout';

export { INSERT_FLASH_MS, INSERT_LAYOUT_MS } from './use_insert_layout_animation';
// Opt-in: sync-warm EUI icons (accordion arrows / node menus). Not run on import;
// the canvas calls it on first render and workflows_management panels call it themselves.
export { WorkflowGraphCanvasWithoutProvider } from './workflow_graph_canvas';
