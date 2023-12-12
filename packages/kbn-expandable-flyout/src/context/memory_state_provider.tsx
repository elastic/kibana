/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren, useCallback, useMemo, useReducer } from 'react';
import { ActionType } from '../actions';
import { reducer } from '../reducer';
import type { ExpandableFlyoutContextValue, FlyoutPanelProps } from '../types';
import { initialState } from '../reducer';
import { ExpandableFlyoutContext } from '../context';

/**
 * In-memory state provider for the expandable flyout, for cases when we don't want changes to be persisted
 * in the url.
 */
export const MemoryStateProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

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
  }, []);

  const contextValue: ExpandableFlyoutContextValue = useMemo(
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
