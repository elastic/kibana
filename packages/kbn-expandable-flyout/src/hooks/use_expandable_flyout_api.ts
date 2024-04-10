/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
import { REDUX_ID_FOR_MEMORY_STORAGE } from '../constants';
import { useExpandableFlyoutContext } from '../context';
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
import { useDispatch } from '../redux';
import { FlyoutPanelProps, type ExpandableFlyoutApi } from '../types';

export type { ExpandableFlyoutApi };

// we store all the functions that should be called when the flyout is closed
let onCloseFunctions: Array<() => void> = [];

/**
 * This hook allows you to interact with the flyout, open panels and previews etc.
 */
export const useExpandableFlyoutApi = () => {
  const dispatch = useDispatch();

  const { urlKey } = useExpandableFlyoutContext();
  // if no urlKey is provided, we are in memory storage mode and use the reserved word 'memory'
  const id = urlKey || REDUX_ID_FOR_MEMORY_STORAGE;

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanelProps;
      left?: FlyoutPanelProps;
      preview?: FlyoutPanelProps;
    }) => dispatch(openPanelsAction({ right, left, preview, id })),
    [dispatch, id]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openRightPanelAction({ right: panel, id })),
    [dispatch, id]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openLeftPanelAction({ left: panel, id })),
    [dispatch, id]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanelProps) => dispatch(openPreviewPanelAction({ preview: panel, id })),
    [dispatch, id]
  );

  const closeRightPanel = useCallback(
    () => dispatch(closeRightPanelAction({ id })),
    [dispatch, id]
  );

  const closeLeftPanel = useCallback(() => dispatch(closeLeftPanelAction({ id })), [dispatch, id]);

  const closePreviewPanel = useCallback(
    () => dispatch(closePreviewPanelAction({ id })),
    [dispatch, id]
  );

  const previousPreviewPanel = useCallback(
    () => dispatch(previousPreviewPanelAction({ id })),
    [dispatch, id]
  );

  const closePanels = useCallback(() => {
    dispatch(closePanelsAction({ id }));

    // running all functions when the flyout closes then resets
    onCloseFunctions.forEach((fc) => fc());
    onCloseFunctions = [];
  }, [dispatch, id]);

  const onClose = useCallback((fc: () => void) => {
    onCloseFunctions.push(fc);
  }, []);

  const api: ExpandableFlyoutApi = useMemo(
    () => ({
      openFlyout: openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closeFlyout: closePanels,
      previousPreviewPanel,
      onClose,
    }),
    [
      openPanels,
      openRightPanel,
      openLeftPanel,
      openPreviewPanel,
      closeRightPanel,
      closeLeftPanel,
      closePreviewPanel,
      closePanels,
      previousPreviewPanel,
      onClose,
    ]
  );

  return api;
};
