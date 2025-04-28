/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';

import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';

export interface GridRowProps {
  rowId: string;
  start: string;
  end: string;
}

export const GridRowWrapper = React.memo(({ rowId, start, end }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

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
      const interactionStyleSubscription = gridLayoutStateManager.interactionEvent$
        // .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe((interactionEvent) => {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowId];
          if (!rowRef) return;
          const targetRow = interactionEvent?.targetRow;
          if (rowId === targetRow && interactionEvent) {
            rowRef.classList.add('kbnGridRow--targeted');
          } else {
            rowRef.classList.remove('kbnGridRow--targeted');
          }
        });

      return () => {
        interactionStyleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowId]
  );

  return (
    <span
      ref={(element: HTMLDivElement | null) =>
        (gridLayoutStateManager.rowRefs.current[rowId] = element)
      }
      className={'kbnGridRowBackground'}
      css={() => {
        return css`
          grid-column-start: 1;
          grid-column-end: -1;
          grid-row-start: ${start}; // first grid row in this row of panels
          grid-row-end: ${end};
        `;
      }}
    />
  );
});

GridRowWrapper.displayName = 'KbnGridLayoutRowWrapper';
