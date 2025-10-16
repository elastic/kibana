/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  closeSidebar,
  openSidebar,
  setSidebarWidth,
  setSidebarFullscreen,
  sidebarReducer,
} from './slice';

export {
  useCurrentSidebarApp,
  useIsCurrentSidebarApp,
  useIsSidebarOpen,
  useIsSidebarFullSize,
  useSidebarWidth,
  useSidebarState,
} from './hooks';

export {
  WORKSPACE_KNOWN_SIDEBAR_APPS,
  WORKSPACE_SIDEBAR_APP_AI_ASSISTANT,
  WORKSPACE_SIDEBAR_APP_FEEDBACK,
  WORKSPACE_SIDEBAR_APP_HELP,
  WORKSPACE_SIDEBAR_APP_NEWSFEED,
  WORKSPACE_SIDEBAR_APP_PROFILE,
  WORKSPACE_SIDEBAR_APP_RECENT,
  type WorkspaceButtonProps,
  type WorkspaceKnownSidebarApp,
  type WorkspaceSidebarApp,
  type WorkspaceSidebarAppProps,
} from './apps';
