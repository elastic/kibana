/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

export const COLLAPSED_WIDTH = 48;
export const EXPANDED_WIDTH = 100;
export const SIDE_PANEL_WIDTH = 248;

interface UseLayoutWidthArgs {
  isSidePanelOpen: boolean;
  showPrimaryItemLabels: boolean;
  setWidth: (width: number) => void;
}

/**
 * Hook for handling layout width changes.
 *
 * The primary navigation is always expanded; only the secondary side panel affects total width.
 *
 * @param isSidePanelOpen - whether the side panel is open.
 * @param setWidth - callback to set the width of the navigation component.
 */
export const useLayoutWidth = ({
  isSidePanelOpen,
  showPrimaryItemLabels,
  setWidth,
}: UseLayoutWidthArgs) => {
  useEffect(() => {
    const primaryNavWidth = showPrimaryItemLabels ? EXPANDED_WIDTH : COLLAPSED_WIDTH;
    const width = isSidePanelOpen ? primaryNavWidth + SIDE_PANEL_WIDTH : primaryNavWidth;

    setWidth(width);
  }, [isSidePanelOpen, showPrimaryItemLabels, setWidth]);
};
