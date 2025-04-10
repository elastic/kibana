/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { combineLatest, skip } from 'rxjs';
import { getTopOffsetForRow } from '../utils/calculations';

export const GridRowDragPreview = React.memo(() => {

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);
  const { gridLayoutStateManager } = useGridLayoutContext();
    useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.activeRowEvent$,
      ])
        .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe(([activeRowEvent]) => {

          if (!dragPreviewRef.current) return;
          const rowId = activeRowEvent?.id;
          if (!rowId) return;
          const currentLayout = gridLayoutStateManager.proposedGridLayout$.getValue() ?? gridLayoutStateManager.gridLayout$.getValue();
          const offset = getTopOffsetForRow(rowId, currentLayout);

          if (!activeRowEvent) {
            dragPreviewRef.current.style.display = 'none';
            dragPreviewRef.current.style.gridColumnStart = ``;
            dragPreviewRef.current.style.gridColumnEnd = ``;
            dragPreviewRef.current.style.gridRowStart = ``;
            dragPreviewRef.current.style.gridRowEnd = ``;
          } else {
            dragPreviewRef.current.style.display = 'block';
            dragPreviewRef.current.style.gridColumnStart = `1`;
            dragPreviewRef.current.style.gridColumnEnd = `-1`;
            dragPreviewRef.current.style.gridRowStart = `${offset + 1}`;
            dragPreviewRef.current.style.gridRowEnd = `${offset + 3}`;
          }
        });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <div ref={dragPreviewRef} className={'kbnGridPanel--rowDragPreview'} css={styles} />;
});

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    width: '100%',
    height: euiTheme.size.xl,
    margin: `${euiTheme.size.s} 0px`,
    position: 'relative',
  });

GridRowDragPreview.displayName = 'KbnGridLayoutRowDragPreview';
