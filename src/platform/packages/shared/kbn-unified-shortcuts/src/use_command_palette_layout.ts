/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useState } from 'react';
import { useEuiTheme, useEuiWindowEvent } from '@elastic/eui';

const COMMAND_PALETTE_MAX_LIST_HEIGHT = 320;

export const useCommandPaletteLayout = () => {
  const { euiTheme } = useEuiTheme();
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  useEuiWindowEvent('resize', () => setViewportHeight(window.innerHeight));

  return useMemo(() => {
    const screenPadding = euiTheme.base * 1.5;
    const availableViewportHeight = viewportHeight - screenPadding * 2;
    const panelVerticalPadding = euiTheme.base * 2;
    const searchInputHeight = euiTheme.base * 2.5;
    const searchToListSpacing = euiTheme.base * 0.5;
    const panelChromeHeight = panelVerticalPadding + searchInputHeight + searchToListSpacing;
    const availableListHeight = Math.max(1, availableViewportHeight - panelChromeHeight);
    const listHeight = Math.min(COMMAND_PALETTE_MAX_LIST_HEIGHT, availableListHeight);
    const panelHeight = panelChromeHeight + listHeight;
    const topOffset = Math.max(0, (availableViewportHeight - panelHeight) / 2);

    return { screenPadding, topOffset, listHeight };
  }, [euiTheme.base, viewportHeight]);
};
