/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { ActionType } from './actions';
import { reducer, State } from './reducer';
import type { FlyoutPanel } from './types';
import { initialState } from './reducer';

export interface ExpandableFlyoutContext {
  /**
   * Right, left and preview panels
   */
  panels: State;
  /**
   * Open the flyout with left, right and/or preview panels
   */
  openFlyout: (panels: { left?: FlyoutPanel; right?: FlyoutPanel; preview?: FlyoutPanel }) => void;
  /**
   * Replaces the current right panel with a new one
   */
  openRightPanel: (panel: FlyoutPanel) => void;
  /**
   * Replaces the current left panel with a new one
   */
  openLeftPanel: (panel: FlyoutPanel) => void;
  /**
   * Add a new preview panel to the list of current preview panels
   */
  openPreviewPanel: (panel: FlyoutPanel) => void;
  /**
   * Closes right panel
   */
  closeRightPanel: () => void;
  /**
   * Closes left panel
   */
  closeLeftPanel: () => void;
  /**
   * Closes all preview panels
   */
  closePreviewPanel: () => void;
  /**
   * Go back to previous preview panel
   */
  previousPreviewPanel: () => void;
  /**
   * Close all panels and closes flyout
   */
  closeFlyout: () => void;
}

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContext | undefined>(
  undefined
);

export interface ExpandableFlyoutProviderProps {
  /**
   * React children
   */
  children: React.ReactNode;
}

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 */
export const ExpandableFlyoutProvider = ({ children }: ExpandableFlyoutProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanel;
      left?: FlyoutPanel;
      preview?: FlyoutPanel;
    }) => dispatch({ type: ActionType.openFlyout, payload: { left, right, preview } }),
    [dispatch]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanel) => dispatch({ type: ActionType.openRightPanel, payload: panel }),
    [dispatch]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanel) => dispatch({ type: ActionType.openLeftPanel, payload: panel }),
    [dispatch]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanel) => dispatch({ type: ActionType.openPreviewPanel, payload: panel }),
    [dispatch]
  );

  const closeRightPanel = useCallback(
    () => dispatch({ type: ActionType.closeRightPanel }),
    [dispatch]
  );

  const closeLeftPanel = useCallback(
    () => dispatch({ type: ActionType.closeLeftPanel }),
    [dispatch]
  );

  const closePreviewPanel = useCallback(
    () => dispatch({ type: ActionType.closePreviewPanel }),
    [dispatch]
  );

  const previousPreviewPanel = useCallback(
    () => dispatch({ type: ActionType.previousPreviewPanel }),
    [dispatch]
  );

  const closePanels = useCallback(() => dispatch({ type: ActionType.closeFlyout }), [dispatch]);

  const contextValue = useMemo(
    () => ({
      panels: state,
      openFlyout: openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closeFlyout: closePanels,
      previousPreviewPanel,
    }),
    [
      state,
      openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closePanels,
      previousPreviewPanel,
    ]
  );

  return (
    <ExpandableFlyoutContext.Provider value={contextValue}>
      {children}
    </ExpandableFlyoutContext.Provider>
  );
};

/**
 * Retrieve context's properties
 */
export const useExpandableFlyoutContext = (): ExpandableFlyoutContext => {
  const contextValue = useContext(ExpandableFlyoutContext);

  if (!contextValue) {
    throw new Error(
      'ExpandableFlyoutContext can only be used within ExpandableFlyoutContext provider'
    );
  }

  return contextValue;
};
