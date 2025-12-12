/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { skip } from 'rxjs';

import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export interface GridSectionProps {
  sectionId: string;
}

export const GridSectionFooter = React.memo(({ sectionId }: GridSectionProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const ref = useRef<HTMLDivElement | null>(null);

  const styles = useMemo(
    () =>
      css({
        gridColumnStart: 1,
        gridColumnEnd: -1,
        gridRowEnd: `span 1`,
        gridRowStart: `end-${sectionId}`,
      }),
    [sectionId]
  );

  useEffect(() => {
    /** Update the styles of the drag preview via a subscription to prevent re-renders */
    const styleSubscription = gridLayoutStateManager.activePanelEvent$
      .pipe(skip(1)) // skip the first emit because the drag preview is only rendered after a user action
      .subscribe((activePanel) => {
        if (!ref.current) return;
        const isTargeted = sectionId === activePanel?.targetSection;
        if (isTargeted) {
          ref.current.classList.add('kbnGridSectionFooter--targeted');
        } else {
          ref.current.classList.remove('kbnGridSectionFooter--targeted');
        }
      });

    return () => {
      styleSubscription.unsubscribe();
    };
  }, [sectionId, gridLayoutStateManager.activePanelEvent$]);

  return <div ref={ref} className={'kbnGridSectionFooter'} css={styles} />;
});

GridSectionFooter.displayName = 'KbnGridLayoutSectionFooter';
