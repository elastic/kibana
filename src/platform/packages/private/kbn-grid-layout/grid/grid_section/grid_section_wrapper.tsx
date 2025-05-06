/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';

import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export interface GridSectionProps {
  sectionId: string;
}

export const GridSectionWrapper = React.memo(({ sectionId }: GridSectionProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const styles = useMemo(() => {
    return css({
      gridColumn: `1 / -1`,
      gridRowStart: `start-${sectionId}`,
      gridRowEnd: `end-${sectionId}`,
    });
  }, [sectionId]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.sectionRefs.current[sectionId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const interactionStyleSubscription = gridLayoutStateManager.activePanel$.subscribe(
        (activePanel) => {
          const rowRef = gridLayoutStateManager.sectionRefs.current[sectionId];
          if (!rowRef) return;
          const targetRow = activePanel?.targetRow;
          if (sectionId === targetRow && activePanel) {
            rowRef.classList.add('kbnGridSection--targeted');
          } else {
            rowRef.classList.remove('kbnGridSection--targeted');
          }
        }
      );

      return () => {
        interactionStyleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sectionId]
  );

  return (
    <span
      css={styles}
      ref={(rowRef: HTMLDivElement | null) => {
        gridLayoutStateManager.sectionRefs.current[sectionId] = rowRef;
      }}
      className={'kbnGridSection'}
    />
  );
});

GridSectionWrapper.displayName = 'KbnGridLayoutSectionwWrapper';
