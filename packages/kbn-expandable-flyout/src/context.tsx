/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
} from 'react';
import { ActionType } from './actions';
import { reducer, State } from './reducer';
import type { FlyoutPanelProps } from './types';
import { initialState } from './reducer';

export interface ExpandableFlyoutContext {
  /**
   * Right, left and preview panels
   */
  panels: State;
  /**
   * Open the flyout with left, right and/or preview panels
   */
  openFlyout: (panels: {
    left?: FlyoutPanelProps;
    right?: FlyoutPanelProps;
    preview?: FlyoutPanelProps;
  }) => void;
  /**
   * Replaces the current right panel with a new one
   */
  openRightPanel: (panel: FlyoutPanelProps) => void;
  /**
   * Replaces the current left panel with a new one
   */
  openLeftPanel: (panel: FlyoutPanelProps) => void;
  /**
   * Add a new preview panel to the list of current preview panels
   */
  openPreviewPanel: (panel: FlyoutPanelProps) => void;
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

export type ExpandableFlyoutApi = Pick<ExpandableFlyoutContext, 'openFlyout'> & {
  getState: () => State;
};

export interface ExpandableFlyoutProviderProps {
  /**
   * React children
   */
  children: React.ReactNode;
  /**
   * Triggered whenever flyout state changes. You can use it to store it's state somewhere for instance.
   */
  onChanges?: (state: State) => void;
  /**
   * Triggered whenever flyout is closed. This is independent from the onChanges above.
   */
  onClosePanels?: () => void;
}

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 */
export const ExpandableFlyoutProvider = React.forwardRef<
  ExpandableFlyoutApi,
  ExpandableFlyoutProviderProps
>(({ children, onChanges = () => {}, onClosePanels = () => {} }, ref) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const closed = !state.right;
    if (closed) {
      // manual close is singalled via separate callback
      return;
    }

    onChanges(state);
  }, [state, onChanges]);

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanelProps;
      left?: FlyoutPanelProps;
      preview?: FlyoutPanelProps;
    }) => dispatch({ type: ActionType.openFlyout, payload: { left, right, preview } }),
    [dispatch]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch({ type: ActionType.openRightPanel, payload: panel }),
    []
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch({ type: ActionType.openLeftPanel, payload: panel }),
    []
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch({ type: ActionType.openPreviewPanel, payload: panel }),
    []
  );

  const closeRightPanel = useCallback(() => dispatch({ type: ActionType.closeRightPanel }), []);

  const closeLeftPanel = useCallback(() => dispatch({ type: ActionType.closeLeftPanel }), []);

  const closePreviewPanel = useCallback(() => dispatch({ type: ActionType.closePreviewPanel }), []);

  const previousPreviewPanel = useCallback(
    () => dispatch({ type: ActionType.previousPreviewPanel }),
    []
  );

  const closePanels = useCallback(() => {
    dispatch({ type: ActionType.closeFlyout });
    onClosePanels();
  }, [onClosePanels]);

  useImperativeHandle(
    ref,
    () => {
      return {
        openFlyout: openPanels,
        getState: () => state,
      };
    },
    [openPanels, state]
  );

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
});

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
