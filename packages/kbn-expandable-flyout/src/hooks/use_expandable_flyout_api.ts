/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo } from 'react';
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

/**
 * This hook allows you to interact with the flyout, open panels and previews etc.
 */
export const useExpandableFlyoutApi = () => {
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
