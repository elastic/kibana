/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  type WorkspaceState,
  setIsLoading,
  useIsLoading,
  useWorkspaceState,
  useCurrentAppId,
  setCurrentAppId,
} from './workspace';

export {
  type HeaderState,
  setHomeHref,
  useHeaderState,
  useHomeHref,
  setLogo,
  useLogo,
} from './header';

export {
  type NavigationState,
  setIsNavigationCollapsed,
  useIsNavigationCollapsed,
  useNavigationState,
  useNavigationWidth,
  setNavigationWidth,
  setActiveItemId,
  useActiveItemId,
} from './navigation';

export {
  closeSidebar,
  openSidebar,
  setSidebarWidth,
  setSidebarFullscreen,
  useCurrentSidebarApp,
  useIsCurrentSidebarApp,
  useIsSidebarOpen,
  useIsSidebarFullSize,
  useSidebarWidth,
  useSidebarState,
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
} from './sidebar';

export {
  type WorkspaceStore,
  createStore,
  type RootWorkspaceState,
  type WorkspaceDispatch,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from './store';

export {
  type WorkspaceLayoutState,
  setIsChromeVisible,
  setHasHeaderBanner,
  setHasAppMenu,
  useIsChromeVisible,
  useHasHeaderBanner,
  useHasAppMenu,
} from './layout';

export type { SidebarSize } from './types';
