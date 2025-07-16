/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

export const COLLAPSED_WIDTH = 47;
export const EXPANDED_WIDTH = 84;
export const DEFAULT_SIDE_PANEL_WIDTH = 261;

interface UseLayoutWidthArgs {
  isCollapsed: boolean;
  isSidePanelOpen: boolean;
  setWidth: (width: number) => void;
}

export const useLayoutWidth = ({ isCollapsed, isSidePanelOpen, setWidth }: UseLayoutWidthArgs) => {
  useEffect(() => {
    setWidth(isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH);
    if (isSidePanelOpen) {
      setWidth(
        isCollapsed
          ? COLLAPSED_WIDTH + DEFAULT_SIDE_PANEL_WIDTH
          : EXPANDED_WIDTH + DEFAULT_SIDE_PANEL_WIDTH
      );
    }
  }, [isCollapsed, isSidePanelOpen, setWidth]);
};
