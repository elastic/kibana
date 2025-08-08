/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import { GridLayoutStateManager } from './types';

export interface GridLayoutContextType<UseCustomDragHandle extends boolean = boolean> {
  gridLayoutStateManager: GridLayoutStateManager;
  useCustomDragHandle: UseCustomDragHandle;
  renderPanelContents: (
    panelId: string,
    setDragHandles: UseCustomDragHandle extends true
      ? (refs: Array<HTMLElement | null>) => void
      : undefined
  ) => React.ReactNode;
}

export const GridLayoutContext = createContext<GridLayoutContextType | undefined>(undefined);

export const useGridLayoutContext = (): GridLayoutContextType => {
  const context = useContext<GridLayoutContextType | undefined>(GridLayoutContext);
  if (!context) {
    throw new Error('useGridLayoutContext must be used inside GridLayoutContext');
  }
  return context;
};
