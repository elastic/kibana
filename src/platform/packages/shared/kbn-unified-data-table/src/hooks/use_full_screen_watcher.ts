/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useGeneratedHtmlId, useMutationObserver } from '@elastic/eui';
import { useCallback, useState } from 'react';
import { css } from '@emotion/css';

export const EUI_DATA_GRID_FULL_SCREEN_CLASS = 'euiDataGrid--fullScreen';
export const UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS = 'unifiedDataTable__fullScreen';
export const EUI_DATA_GRID_RESTRICT_BODY_CLASS = 'euiDataGrid__restrictBody';

/**
 * Hook that checks if there is a EUI Data Grid in full screen mode
 * by observing the document.body classList for 'euiDataGrid__restrictBody'.
 *
 * This is a lightweight alternative to `useFullScreenWatcher` for components
 * that need to react to fullscreen state without owning/rendering the data grid.
 *
 * @returns boolean indicating if any data grid is currently in fullscreen mode
 *
 * @example
 * ```tsx
 * const MyComponent = () => {
 *   const isFullScreen = useIsDataGridFullScreen();
 *
 *   if (isFullScreen) {
 *     return null; // hide in fullscreen
 *   }
 *
 *   return <div>My content</div>;
 * };
 * ```
 */
export const useIsDataGridFullScreen = (): boolean => {
  const [isFullScreen, setIsFullScreen] = useState(() =>
    document.body.classList.contains(EUI_DATA_GRID_RESTRICT_BODY_CLASS)
  );

  const onBodyClassChange = useCallback(() => {
    setIsFullScreen(document.body.classList.contains(EUI_DATA_GRID_RESTRICT_BODY_CLASS));
  }, []);

  useMutationObserver(document.body, onBodyClassChange, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return isFullScreen;
};

/**
 * Hook for components that own and render a data grid.
 * Manages fullscreen state, generates IDs, and provides refs for the grid wrapper.
 *
 * If you just need to know if a grid is fullscreen (without owning it),
 * use `useIsDataGridFullScreen` instead.
 *
 * @returns Object with dataGridId and dataGridWrapper ref setter
 */
export const useFullScreenWatcher = () => {
  const dataGridId = useGeneratedHtmlId({ prefix: 'unifiedDataTable' });
  const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);
  const [dataGrid, setDataGrid] = useState<HTMLElement | null>(null);

  const checkForDataGrid = useCallback<MutationCallback>(
    (_, observer) => {
      const foundDataGrid = document.getElementById(dataGridId);

      if (foundDataGrid) {
        setDataGrid(foundDataGrid);
        observer.disconnect();
      }
    },
    [dataGridId]
  );

  const watchForFullScreen = useCallback<MutationCallback>(() => {
    if (dataGrid) {
      toggleFullScreen(dataGrid);
    }
  }, [dataGrid]);

  useMutationObserver(dataGridWrapper, checkForDataGrid, { childList: true, subtree: true });

  useMutationObserver(dataGrid, watchForFullScreen, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return { dataGridId, dataGridWrapper, setDataGridWrapper };
};

// Ensure full screen data grids are not covered by elements with a z-index
const fullScreenStyles = css`
  *:not(
      .${EUI_DATA_GRID_FULL_SCREEN_CLASS}, .${EUI_DATA_GRID_FULL_SCREEN_CLASS} *,
      [data-euiportal='true'],
      [data-euiportal='true'] *
    ) {
    z-index: unset !important;
  }
`;

const classesToToggle = [UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS, fullScreenStyles];
const toggleFullScreen = (dataGrid: HTMLElement) => {
  const fullScreenClass = dataGrid.classList.contains(EUI_DATA_GRID_FULL_SCREEN_CLASS);

  if (fullScreenClass) {
    document.body.classList.add(...classesToToggle);
  } else {
    document.body.classList.remove(...classesToToggle);
  }
};
