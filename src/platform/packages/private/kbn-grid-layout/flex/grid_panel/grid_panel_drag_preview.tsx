/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { filter, map, pairwise, skip, startWith } from 'rxjs';

import { css } from '@emotion/react';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const GridPanelDragPreview = React.memo(() => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = gridLayoutStateManager.activePanelEvent$
        .pipe(
          skip(1),
          pairwise(),
          filter(([before]) => before !== undefined),
          map(([, after]) => after),
          startWith(undefined)
        ) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe((activePanel) => {
          if (activePanel?.type === 'resize' || !dragPreviewRef.current) return;
          const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
          const panel = activePanel ? gridLayout[activePanel.id] : undefined;
          if (!panel) {
            dragPreviewRef.current.style.display = 'none';
          } else {
            dragPreviewRef.current.style.display = 'block';
            // mirror the sizing of a real panel so the preview matches the dragged control
            dragPreviewRef.current.style.width = `${panel.width}px`;
            dragPreviewRef.current.style.flexGrow = panel.grow ? '1' : '0';
            dragPreviewRef.current.style.order = `${panel.order + 1}`;
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
    <div ref={dragPreviewRef} className={'kbnFlexPanel--dragPreview'} css={styles} aria-hidden />
  );
});

const styles = css({
  display: 'none',
  pointerEvents: 'none',
  height: 'calc(var(--kbnFlexRowHeight) * 1px)',
});

GridPanelDragPreview.displayName = 'kbnFlexLayoutPanelDragPreview';
