/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef } from 'react';
import { skip } from 'rxjs';

import { css } from '@emotion/react';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const GridPanelDragPreview = React.memo(() => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = gridLayoutStateManager.activePanelEvent$
        .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe((activePanel) => {
          if (!dragPreviewRef.current) return;
          const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
          const sectionId = activePanel?.targetSection;
          if (!activePanel || !sectionId || !gridLayout[sectionId]?.panels[activePanel.id]) {
            dragPreviewRef.current.style.display = 'none';
          } else {
            const panel = gridLayout[sectionId].panels[activePanel.id];
            dragPreviewRef.current.style.display = 'block';
            dragPreviewRef.current.style.gridColumnStart = `${panel.column + 1}`;
            dragPreviewRef.current.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            dragPreviewRef.current.style.gridRowStart = `${`gridRow-${sectionId}`} ${
              panel.row + 1
            }`;
            dragPreviewRef.current.style.gridRowEnd = `span ${panel.height}`;
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

GridPanelDragPreview.displayName = 'KbnGridLayoutPanelDragPreview';
