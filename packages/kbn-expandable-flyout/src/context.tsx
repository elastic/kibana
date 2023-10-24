/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
} from 'react';
import type { FlyoutPanelProps } from './types';
import { ActionType } from './actions';
import { reducer, State } from './reducer';
import { initialState } from './reducer';
import { useRightPanel } from './hooks/use_right_panel';
import { useLeftPanel } from './hooks/use_left_panel';
import { usePreviewPanel } from './hooks/use_preview_panel';

export interface ExpandableFlyoutContext {
  /**
   *
   */
  panels: State;
  /**
   * Open the flyout with left, right and/or preview panels
   */
  openFlyout: (
    panels: {
      left?: FlyoutPanelProps;
      right?: FlyoutPanelProps;
      preview?: FlyoutPanelProps[];
    },
    persistInUrl?: boolean
  ) => void;
  /**
   * Replaces the current right panel with a new one
   */
  openRightPanel: (panel: FlyoutPanelProps, persistInUrl?: boolean) => void;
  /**
   * Replaces the current left panel with a new one
   */
  openLeftPanel: (panel: FlyoutPanelProps, persistInUrl?: boolean) => void;
  /**
   * Add a new preview panel to the list of current preview panels
   */
  openPreviewPanel: (panel: FlyoutPanelProps, persistInUrl?: boolean) => void;
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
  previousPreviewPanel: (persistInUrl?: boolean) => void;
  /**
   * Close all panels and closes flyout
   */
  closeFlyout: () => void;
}

export const ExpandableFlyoutContext = createContext<ExpandableFlyoutContext | undefined>(
  undefined
);

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 */
export const ExpandableFlyoutProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [urlState, setUrlState] = useState<boolean>(true);
  const [state, dispatch] = useReducer(reducer, initialState);
  const { rightPanelState, setRightPanelState } = useRightPanel();
  const { leftPanelState, setLeftPanelState } = useLeftPanel();
  const { previewPanelState, setPreviewPanelState } = usePreviewPanel();

  const openPanels = useCallback(
    (
      {
        right,
        left,
        preview,
      }: {
        right?: FlyoutPanelProps;
        left?: FlyoutPanelProps;
        preview?: FlyoutPanelProps[];
      },
      persistInUrl: boolean = true
    ) => {
      setUrlState(persistInUrl);
      console.log('persistInUrl', persistInUrl);
      if (persistInUrl) {
        console.log('url right', right);
        setRightPanelState(right);
        setLeftPanelState(left);
        setPreviewPanelState(preview);
      } else {
        console.log('reducer right', right);
        dispatch({ type: ActionType.openFlyout, payload: { left, right, preview } });
      }
    },
    [dispatch, setRightPanelState, setLeftPanelState, setPreviewPanelState]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanelProps, persistInUrl: boolean = true) => {
      setUrlState(persistInUrl);
      if (persistInUrl) {
        setRightPanelState(panel);
      } else {
        dispatch({ type: ActionType.openRightPanel, payload: panel });
      }
    },
    [setRightPanelState]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanelProps, persistInUrl: boolean = true) => {
      setUrlState(persistInUrl);
      if (persistInUrl) {
        setLeftPanelState(panel);
      } else {
        dispatch({ type: ActionType.openPreviewPanel, payload: panel });
      }
    },
    [setLeftPanelState]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanelProps, persistInUrl: boolean = true) => {
      setUrlState(persistInUrl);
      if (persistInUrl) {
        setPreviewPanelState([...(previewPanelState ?? []), panel]);
      } else {
        dispatch({ type: ActionType.openPreviewPanel, payload: panel });
      }
    },
    [previewPanelState, setPreviewPanelState]
  );

  const closeRightPanel = useCallback(() => {
    setRightPanelState(undefined);
    dispatch({ type: ActionType.closeRightPanel });
  }, [setRightPanelState]);

  const closeLeftPanel = useCallback(() => {
    setLeftPanelState(undefined);
    dispatch({ type: ActionType.closeLeftPanel });
  }, [setLeftPanelState]);

  const closePreviewPanel = useCallback(() => {
    setPreviewPanelState(undefined);
    dispatch({ type: ActionType.closePreviewPanel });
  }, [setPreviewPanelState]);

  const previousPreviewPanel = useCallback(
    (persistInUrl: boolean = true) => {
      setUrlState(persistInUrl);
      if (persistInUrl) {
        setPreviewPanelState(previewPanelState?.slice(0, previewPanelState.length - 1));
      } else {
        dispatch({ type: ActionType.previousPreviewPanel });
      }
    },
    [previewPanelState, setPreviewPanelState]
  );

  const closePanels = useCallback(() => {
    setRightPanelState(undefined);
    setLeftPanelState(undefined);
    setPreviewPanelState(undefined);
    dispatch({ type: ActionType.closeFlyout });
  }, [setRightPanelState, setLeftPanelState, setPreviewPanelState]);

  const contextValue = useMemo(
    () => ({
      panels: urlState
        ? {
            right: rightPanelState,
            left: leftPanelState,
            preview: previewPanelState,
          }
        : state,
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
      urlState,
      rightPanelState,
      leftPanelState,
      previewPanelState,
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
