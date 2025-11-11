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

export const useFullScreenWatcher = () => {
  const dataGridId = useGeneratedHtmlId({ prefix: 'unifiedDataTable' });
  const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);
  const [dataGrid, setDataGrid] = useState<HTMLElement | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

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
      setIsFullScreen(dataGrid.classList.contains(EUI_DATA_GRID_FULL_SCREEN_CLASS));
    }
  }, [dataGrid]);

  useMutationObserver(dataGridWrapper, checkForDataGrid, { childList: true, subtree: true });

  useMutationObserver(dataGrid, watchForFullScreen, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return { dataGridId, dataGridWrapper, setDataGridWrapper, isFullScreen };
};

export const EUI_DATA_GRID_FULL_SCREEN_CLASS = 'euiDataGrid--fullScreen';
export const UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS = 'unifiedDataTable__fullScreen';

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
