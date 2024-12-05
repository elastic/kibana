/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames';
import { combineLatest, distinctUntilChanged, filter, map, pairwise, skip } from 'rxjs';

import { css } from '@emotion/react';
import { GridHeightSmoother } from './grid_height_smoother';
import { GridRow } from './grid_row';
import { GridAccessMode, GridLayoutData, GridSettings } from './types';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { resolveGridRow } from './utils/resolve_grid_row';

export interface GridLayoutProps {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  renderPanelContents: (panelId: string) => React.ReactNode;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
}

export const GridLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  expandedPanelId,
  accessMode = 'EDIT',
}: GridLayoutProps) => {
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    gridSettings,
    expandedPanelId,
    accessMode,
  });
  useGridLayoutEvents({ gridLayoutStateManager });

  const [rowCount, setRowCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );

  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    if (!isLayoutEqual(layout, gridLayoutStateManager.gridLayout$.getValue())) {
      const newLayout = cloneDeep(layout);
      /**
       * the layout sent in as a prop is not guaranteed to be valid (i.e it may have floating panels) -
       * so, we need to loop through each row and ensure it is compacted
       */
      newLayout.forEach((row, rowIndex) => {
        newLayout[rowIndex] = resolveGridRow(row);
      });
      gridLayoutStateManager.gridLayout$.next(newLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /**
   * Set up subscriptions
   */
  useEffect(() => {
    /**
     * The only thing that should cause the entire layout to re-render is adding a new row;
     * this subscription ensures this by updating the `rowCount` state when it changes.
     */
    const rowCountSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        skip(1), // we initialized `rowCount` above, so skip the initial emit
        map((newLayout) => newLayout.length),
        distinctUntilChanged()
      )
      .subscribe((newRowCount) => {
        setRowCount(newRowCount);
      });

    const onLayoutChangeSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.interactionEvent$,
    ])
      .pipe(
        // if an interaction event is happening, then ignore any "draft" layout changes
        filter(([_, event]) => !Boolean(event)),
        // once no interaction event, create pairs of "old" and "new" layouts for comparison
        map(([newLayout]) => newLayout),
        pairwise()
      )
      .subscribe(([layoutBefore, layoutAfter]) => {
        if (!isLayoutEqual(layoutBefore, layoutAfter)) {
          onLayoutChange(layoutAfter);
        }
      });

    return () => {
      rowCountSubscription.unsubscribe();
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Memoize row children components to prevent unnecessary re-renders
   */
  const children = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return (
        <GridRow
          key={rowIndex}
          rowIndex={rowIndex}
          renderPanelContents={renderPanelContents}
          gridLayoutStateManager={gridLayoutStateManager}
          setInteractionEvent={(nextInteractionEvent) => {
            if (!nextInteractionEvent) {
              gridLayoutStateManager.activePanel$.next(undefined);
            }
            gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
          }}
          ref={(element: HTMLDivElement | null) =>
            (gridLayoutStateManager.rowRefs.current[rowIndex] = element)
          }
        />
      );
    });
  }, [rowCount, gridLayoutStateManager, renderPanelContents]);

  const gridClassNames = classNames('kbnGrid', {
    'kbnGrid--static': expandedPanelId || accessMode === 'VIEW',
    'kbnGrid--hasExpandedPanel': Boolean(expandedPanelId),
  });

  return (
    <GridHeightSmoother gridLayoutStateManager={gridLayoutStateManager}>
      <div
        ref={(divElement) => {
          setDimensionsRef(divElement);
        }}
        className={gridClassNames}
        css={css`
          &.kbnGrid--hasExpandedPanel {
            height: 100%;
          }
        `}
      >
        {children}
      </div>
    </GridHeightSmoother>
  );
};
