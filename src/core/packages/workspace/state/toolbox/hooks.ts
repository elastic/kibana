/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type RootWorkspaceState, useWorkspaceSelector } from '../store';

export const useToolboxState = () =>
  useWorkspaceSelector((state: RootWorkspaceState) => state.toolbox);

export const useIsToolboxOpen = () => useToolboxState().isOpen;
export const useCurrentTool = () => {
  const isOpen = useIsToolboxOpen();
  const currentToolId = useToolboxState().currentToolId;
  return isOpen ? currentToolId : null;
};
export const useIsCurrentTool = (toolId?: string) => useCurrentTool() === toolId;

export const useToolboxSize = () => {
  const { size } = useToolboxState();
  return useIsToolboxOpen() ? size : null;
};
