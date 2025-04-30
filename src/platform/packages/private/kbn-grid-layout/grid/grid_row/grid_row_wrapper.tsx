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

export interface GridRowProps {
  rowId: string;
}

export const GridRowWrapper = React.memo(({ rowId }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  const styles = useMemo(() => {
    return css({
      gridColumn: `1 / -1`,
      gridRowStart: `gridRow-${rowId}`,
      gridRowEnd: `end-${rowId}`,
    });
  }, [rowId]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.rowRefs.current[rowId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const interactionStyleSubscription = gridLayoutStateManager.activePanel$.subscribe(
        (activePanel) => {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowId];
          if (!rowRef) return;
          const targetRow = activePanel?.targetRow;
          if (rowId === targetRow && activePanel) {
            rowRef.classList.add('kbnGridRow--targeted');
          } else {
            rowRef.classList.remove('kbnGridRow--targeted');
          }
        }
      );

      return () => {
        interactionStyleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowId]
  );

  return (
    <span
      css={styles}
      ref={(rowRef: HTMLDivElement | null) => {
        gridLayoutStateManager.rowRefs.current[rowId] = rowRef;
      }}
      className={'kbnGridRowBackground'}
    />
  );
});

GridRowWrapper.displayName = 'KbnGridLayoutRowWrapper';
