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
  hidePrimaryLabels: boolean;
  isSidePanelOpen: boolean;
  sidePanelWidth?: number;
  setWidth: (width: number) => void;
}

/**
 * Hook for handling layout width changes.
 *
 * @param hidePrimaryLabels - whether primary nav labels are hidden (icon-only mode).
 * @param isSidePanelOpen - whether the side panel is open.
 * @param setWidth - callback to set the width of the navigation component.
 */
export const useLayoutWidth = ({
  hidePrimaryLabels,
  isSidePanelOpen,
  sidePanelWidth = SIDE_PANEL_WIDTH,
  setWidth,
}: UseLayoutWidthArgs) => {
  useEffect(() => {
    const baseWidth = hidePrimaryLabels ? COLLAPSED_WIDTH : EXPANDED_WIDTH;
    const width = isSidePanelOpen ? baseWidth + sidePanelWidth : baseWidth;

    setWidth(width);
  }, [hidePrimaryLabels, isSidePanelOpen, sidePanelWidth, setWidth]);
};
