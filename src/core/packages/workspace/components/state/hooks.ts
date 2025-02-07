/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypedUseSelectorHook } from 'react-redux';
import { useDispatch, useSelector } from 'react-redux';
import type { RootWorkspaceState, WorkspaceDispatch } from './store';

export const useWorkspaceDispatch: () => WorkspaceDispatch = useDispatch;
export const useWorkspaceSelector: TypedUseSelectorHook<RootWorkspaceState> = useSelector;

/* Workspace */
export const useWorkspaceState = () =>
  useWorkspaceSelector((state: RootWorkspaceState) => state.workspace);

export const useIsWorkspaceOpen = () => useCurrentTool() !== null;

/* Navigation */
export const useNavigationState = () => useWorkspaceState().navigation;
export const useIsNavigationOpen = () => useNavigationState().isOpen;

/* Toolbox */
export const useToolboxState = () => useWorkspaceState().toolbox;

export const useCurrentTool = () => useToolboxState().currentToolId;
export const useIsCurrentTool = (toolId?: string) => useCurrentTool() === toolId;

export const useIsToolboxOpen = (toolId?: string) => {
  const isCurrent = useIsCurrentTool(toolId);
  const isOpen = useIsWorkspaceOpen();
  return isCurrent && isOpen;
};

export const useToolboxSize = () => {
  const { size } = useToolboxState();
  return useIsWorkspaceOpen() ? size : null;
};
