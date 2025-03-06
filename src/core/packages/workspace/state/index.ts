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
  setHasBanner,
  setHasFooter,
  setIsChromeVisible,
  setIsLoading,
  setIsModern,
  useHasBanner,
  useHasFooter,
  useIsChromeVisible,
  useIsLoading,
  useWorkspaceState,
  useIsModern,
  setIsToolboxRight,
  useIsToolboxRight,
  setIsSearchInToolbox,
  useIsSearchInToolbox,
} from './workspace';

export {
  type HeaderState,
  setHomeHref,
  setIconType,
  useHeaderState,
  useHomeHref,
  useIconType,
} from './header';

export {
  type NavigationState,
  setIsNavigationCollapsed,
  useIsNavigationCollapsed,
  useNavigationState,
} from './navigation';

export {
  closeToolbox,
  openToolbox,
  setToolboxSize,
  useCurrentTool,
  useIsCurrentTool,
  useIsToolboxOpen,
  useToolboxSize,
  useToolboxState,
} from './toolbox';

export {
  store,
  type RootWorkspaceState,
  type WorkspaceDispatch,
  useWorkspaceDispatch,
  useWorkspaceSelector,
} from './store';

export { WorkspaceProvider, type WorkspaceProviderProps, useWorkspaceContext } from './provider';

export type { ToolboxSize } from './types';
