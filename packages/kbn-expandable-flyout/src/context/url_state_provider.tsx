/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, PropsWithChildren, useCallback, useMemo } from 'react';
import { FlyoutPanelProps, ExpandableFlyoutContextValue } from '../types';
import { useRightPanel } from '../hooks/use_right_panel';
import { useLeftPanel } from '../hooks/use_left_panel';
import { usePreviewPanel } from '../hooks/use_preview_panel';
import { ExpandableFlyoutContext } from '../context';
import { State } from '../reducer';

/**
 * Private component that manages flyout state with url query params
 */
export const UrlStateProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { setRightPanelState, rightPanelState } = useRightPanel();
  const { setLeftPanelState, leftPanelState } = useLeftPanel();
  const { previewState, setPreviewState } = usePreviewPanel();

  const panels: State = useMemo(
    () => ({
      left: leftPanelState,
      right: rightPanelState,
      preview: previewState || [],
    }),
    [leftPanelState, previewState, rightPanelState]
  );

  const openPanels = useCallback(
    ({
      right,
      left,
      preview,
    }: {
      right?: FlyoutPanelProps;
      left?: FlyoutPanelProps;
      preview?: FlyoutPanelProps;
    }) => {
      setRightPanelState(right);
      setLeftPanelState(left);
      setPreviewState(preview ? [preview] : []);
    },
    [setRightPanelState, setLeftPanelState, setPreviewState]
  );

  const openRightPanel = useCallback(
    (panel: FlyoutPanelProps) => {
      setRightPanelState(panel);
    },
    [setRightPanelState]
  );

  const openLeftPanel = useCallback(
    (panel: FlyoutPanelProps) => setLeftPanelState(panel),
    [setLeftPanelState]
  );

  const openPreviewPanel = useCallback(
    (panel: FlyoutPanelProps) => setPreviewState([...(previewState ?? []), panel]),
    [previewState, setPreviewState]
  );

  const closeRightPanel = useCallback(() => setRightPanelState(undefined), [setRightPanelState]);

  const closeLeftPanel = useCallback(() => setLeftPanelState(undefined), [setLeftPanelState]);

  const closePreviewPanel = useCallback(() => setPreviewState([]), [setPreviewState]);

  const previousPreviewPanel = useCallback(
    () => setPreviewState(previewState?.slice(0, previewState.length - 1)),
    [previewState, setPreviewState]
  );

  const closePanels = useCallback(() => {
    setRightPanelState(undefined);
    setLeftPanelState(undefined);
    setPreviewState([]);
  }, [setRightPanelState, setLeftPanelState, setPreviewState]);

  const contextValue: ExpandableFlyoutContextValue = useMemo(
    () => ({
      panels,
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
      panels,
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
