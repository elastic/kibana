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

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { GridLayoutStateManager } from './types';

export const DragPreview = ({
  rowIndex,
  gridLayoutStateManager,
}: {
  rowIndex: number;
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const { euiTheme } = useEuiTheme();

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.activePanel$,
        gridLayoutStateManager.proposedGridLayout$,
      ])
        .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe(([activePanel, proposedGridLayout]) => {
          if (!dragPreviewRef.current) return;

          if (!activePanel || !proposedGridLayout?.[rowIndex].panels[activePanel.id]) {
            dragPreviewRef.current.style.display = 'none';
          } else {
            const panel = proposedGridLayout[rowIndex].panels[activePanel.id];
            dragPreviewRef.current.style.display = 'block';
            dragPreviewRef.current.style.height = `calc(1px * (${panel.height} * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) - var(--kbnGridGutterSize)))`;
            dragPreviewRef.current.style.width = `calc(1px * (${panel.width} * (var(--kbnGridColumnWidth) + var(--kbnGridGutterSize)) - var(--kbnGridGutterSize)))`;
            dragPreviewRef.current.style.top = `calc(1px * (${panel.row} * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize))))`;
            dragPreviewRef.current.style.left = `calc(1px * (${panel.column} * (var(--kbnGridColumnWidth) + var(--kbnGridGutterSize))))`;
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
      className={'kbnGridPanel--dragPreview'}
      css={css`
        display: none;
        pointer-events: none;
        position: absolute;
      `}
    />
  );
};
