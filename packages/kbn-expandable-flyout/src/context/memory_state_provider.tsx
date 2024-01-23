/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, FC, useCallback, useMemo } from 'react';
import {
  createDispatchHook,
  createSelectorHook,
  Provider as ReduxProvider,
  ReactReduxContextValue,
} from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { reducer } from '../reducer';
import { initialState, State } from '../state';
import type { ExpandableFlyoutApi, FlyoutPanelProps } from '../types';
import {
  closeLeftPanelAction,
  closePanelsAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  openLeftPanelAction,
  openPanelsAction,
  openPreviewPanelAction,
  openRightPanelAction,
  previousPreviewPanelAction,
} from '../actions';

export const store = configureStore({
  reducer,
  devTools: process.env.NODE_ENV !== 'production',
  preloadedState: {},
  enhancers: [],
});

export const Context = createContext<ReactReduxContextValue<State>>({
  store,
  storeState: initialState,
});

const useDispatch = createDispatchHook(Context);
const useSelector = createSelectorHook(Context);

export const useFlyoutMemoryState = (): ExpandableFlyoutApi => {
  const state = useSelector((s) => s);
  const dispatch = useDispatch();

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanelProps;
      left?: FlyoutPanelProps;
      preview?: FlyoutPanelProps;
    }) => dispatch(openPanelsAction({ right, left, preview })),
    [dispatch]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openRightPanelAction(panel)),
    [dispatch]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openLeftPanelAction(panel)),
    [dispatch]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openPreviewPanelAction(panel)),
    [dispatch]
  );

  const closeRightPanel = useCallback(() => dispatch(closeRightPanelAction()), [dispatch]);

  const closeLeftPanel = useCallback(() => dispatch(closeLeftPanelAction()), [dispatch]);

  const closePreviewPanel = useCallback(() => dispatch(closePreviewPanelAction()), [dispatch]);

  const previousPreviewPanel = useCallback(
    () => dispatch(previousPreviewPanelAction()),
    [dispatch]
  );

  const closePanels = useCallback(() => {
    dispatch(closePanelsAction());
  }, [dispatch]);

  const api: ExpandableFlyoutApi = useMemo(
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

  return api;
};

/**
 * In-memory state provider for the expandable flyout, for cases when we don't want changes to be persisted
 * in the url.
 */
export const MemoryStateProvider: FC = ({ children }) => {
  return (
    <ReduxProvider context={Context} store={store}>
      {children}
    </ReduxProvider>
  );
};
