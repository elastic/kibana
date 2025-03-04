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

import { css } from '@emotion/react';
import { useGridLayoutContext } from './use_grid_layout_context';

export const DragPreview = React.memo(({ rowIndex }: { rowIndex: number }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

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

  return <div ref={dragPreviewRef} className={'kbnGridPanel--dragPreview'} css={styles} />;
});

const styles = css({ display: 'none', pointerEvents: 'none' });

DragPreview.displayName = 'KbnGridLayoutDragPreview';
