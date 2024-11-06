/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { combineLatest, skip } from 'rxjs';

import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

import { GridLayoutStateManager } from './types';

export const DragPreview = ({
  rowIndex,
  gridLayoutStateManager,
}: {
  rowIndex: number;
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.activePanel$,
        gridLayoutStateManager.gridLayout$,
      ])
        .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe(([activePanel, gridLayout]) => {
          if (!dragPreviewRef.current) return;

          if (!activePanel || !gridLayout[rowIndex].panels[activePanel.id]) {
            dragPreviewRef.current.style.display = 'none';
          } else {
            const panel = gridLayout[rowIndex].panels[activePanel.id];
            dragPreviewRef.current.style.display = 'block';
            dragPreviewRef.current.style.gridColumnStart = `${panel.column + 1}`;
            dragPreviewRef.current.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            dragPreviewRef.current.style.gridRowStart = `${panel.row + 1}`;
            dragPreviewRef.current.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
          }
        });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      ref={dragPreviewRef}
      css={css`
        display: none;
        pointer-events: none;
        border-radius: ${euiThemeVars.euiBorderRadius};
        background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
        transition: opacity 100ms linear;
      `}
    />
  );
};
