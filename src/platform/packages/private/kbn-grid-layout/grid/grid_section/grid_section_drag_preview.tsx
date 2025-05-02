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

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export const GridSectionDragPreview = React.memo(() => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const dragPreviewRef = useRef<HTMLDivElement | null>(null);

  // useEffect(
  //   () => {
  //     return () => {
  //       // when drag preview unmounts, this means the header was dropped - so, scroll to it
  //       const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
  //       headerRef?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  //     };
  //   },
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  //   []
  // );

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = gridLayoutStateManager.activeRowEvent$
        .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
        .subscribe((activeRow) => {
          if (!dragPreviewRef.current) return;
          const sectionId = activeRow?.id;
          if (!activeRow || !sectionId) {
            dragPreviewRef.current.style.display = 'none';
          } else {
            dragPreviewRef.current.style.display = 'block';
            dragPreviewRef.current.style.gridColumnStart = `1`;
            dragPreviewRef.current.style.gridColumnEnd = `-1`;
            dragPreviewRef.current.style.gridRowStart = `start-${sectionId}`;
            dragPreviewRef.current.style.gridRowEnd = `end-${sectionId}`;
          }
        });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return <div ref={dragPreviewRef} className={'kbnGridSection--dragPreview'} css={styles} />;
});

const styles = ({ euiTheme }: UseEuiTheme) =>
  css({
    display: 'none',
    height: euiTheme.size.xxxl,
    position: 'relative',
  });

GridSectionDragPreview.displayName = 'KbnGridLayoutSectionDragPreview';
