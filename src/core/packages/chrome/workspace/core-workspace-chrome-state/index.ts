/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { type WorkspaceState, setIsLoading, useIsLoading, useWorkspaceState } from './workspace';

export { type HeaderState, setHomeHref, useHeaderState, useHomeHref } from './header';

export {
  type NavigationState,
  setIsNavigationCollapsed,
  useIsNavigationCollapsed,
  useNavigationState,
  useNavigationWidth,
  setNavigationWidth,
} from './navigation';

export {
  closeToolbar,
  openToolbar,
  setToolbarSize,
  useCurrentTool,
  useIsCurrentTool,
  useIsToolbarOpen,
  useToolbarSize,
  useToolbarState,
  WORKSPACE_KNOWN_TOOLS,
  WORKSPACE_TOOL_AI_ASSISTANT,
  WORKSPACE_TOOL_FEEDBACK,
  WORKSPACE_TOOL_HELP,
  WORKSPACE_TOOL_NEWSFEED,
  WORKSPACE_TOOL_PROFILE,
  WORKSPACE_TOOL_RECENT,
  type WorkspaceButtonProps,
  type WorkspaceKnownTool,
  type WorkspaceTool,
  type WorkspaceToolProps,
} from './toolbar';

export {
  type WorkspaceStore,
  createStore,
  type RootWorkspaceState,
  type WorkspaceDispatch,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from './store';

export type { ToolbarSize } from './types';
