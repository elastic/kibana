/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RootWorkspaceState, useWorkspaceSelector } from '../store';

export const useSidebarState = () =>
  useWorkspaceSelector((state: RootWorkspaceState) => state.sidebar);

export const useIsSidebarOpen = () => useSidebarState().isOpen;
export const useCurrentSidebarApp = () => {
  const isOpen = useIsSidebarOpen();
  const currentSidebarAppId = useSidebarState().currentSidebarAppId;
  return isOpen ? currentSidebarAppId : null;
};
export const useIsCurrentSidebarApp = (toolId?: string) => useCurrentSidebarApp() === toolId;

export const useSidebarWidth = () => {
  const { width } = useSidebarState();
  return useIsSidebarOpen() ? width : null;
};

export const useIsSidebarFullSize = () => {
  const { isFullscreen } = useSidebarState();
  return useIsSidebarOpen() ? isFullscreen : false;
};
