/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useGeneratedHtmlId } from '@elastic/eui';
import { useEffect, useState } from 'react';
import { css } from '@emotion/css';

export const useFullScreenWatcher = () => {
  const dataGridId = useGeneratedHtmlId({ prefix: 'unifiedDataTable' });
  const [dataGridWrapper, setDataGridWrapper] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!dataGridWrapper) {
      return;
    }

    // Only touch the body classes when this data grid's full screen state changes,
    // so data grids sharing the page don't reset each other's full screen styles
    let isFullScreen = false;
    const syncFullScreen = (nextIsFullScreen: boolean) => {
      if (nextIsFullScreen === isFullScreen) {
        return;
      }
      isFullScreen = nextIsFullScreen;
      toggleFullScreen(isFullScreen);
    };

    // Look up the data grid on every change instead of holding on to its element,
    // this allows to handle the case where the data grid is remounted.
    const observer = new MutationObserver(() => {
      const dataGrid = document.getElementById(dataGridId);
      syncFullScreen(Boolean(dataGrid?.classList.contains(EUI_DATA_GRID_FULL_SCREEN_CLASS)));
    });

    observer.observe(dataGridWrapper, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      observer.disconnect();
      // Don't leave the full screen styles behind if the data grid goes away while in full screen
      syncFullScreen(false);
    };
  }, [dataGridId, dataGridWrapper]);

  return { dataGridId, dataGridWrapper, setDataGridWrapper };
};

export const EUI_DATA_GRID_FULL_SCREEN_CLASS = 'euiDataGrid--fullScreen';
export const UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS = 'unifiedDataTable__fullScreen';

// Ensure full screen data grids are not covered by elements with a z-index.
// Elements can opt out of the z-index reset by setting data-kbn-preserve-zindex="true",
// which preserves their stacking context and that of their descendants.
const fullScreenStyles = css`
  *:not(
  .${EUI_DATA_GRID_FULL_SCREEN_CLASS}, .${EUI_DATA_GRID_FULL_SCREEN_CLASS} *,
  [data-euiportal='true'],
  [data-euiportal='true'] *,
  [data-kbn-preserve-zindex],
  [data-kbn-preserve-zindex] *
  ) {
    z-index: unset !important;
  }
`;

const classesToToggle = [UNIFIED_DATA_TABLE_FULL_SCREEN_CLASS, fullScreenStyles];
const toggleFullScreen = (isFullScreen: boolean) => {
  if (isFullScreen) {
    document.body.classList.add(...classesToToggle);
  } else {
    document.body.classList.remove(...classesToToggle);
  }
};
