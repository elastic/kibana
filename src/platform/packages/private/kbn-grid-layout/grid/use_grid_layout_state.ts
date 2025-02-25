/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme } from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import { cloneDeep, pick } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, distinctUntilChanged } from 'rxjs';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';

import {
  ActivePanel,
  GridAccessMode,
  GridLayoutData,
  GridLayoutStateManager,
  GridPanelData,
  GridSettings,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';
import { shouldShowMobileView } from './utils/mobile_view';
import { getKeysInOrder, resolveGridRow } from './utils/resolve_grid_row';

export const useGridLayoutState = ({
  layout,
  layoutRef,
  gridSettings,
  expandedPanelId,
  accessMode,
}: {
  layout: GridLayoutData;
  layoutRef: React.MutableRefObject<HTMLDivElement | null>;
  gridSettings: GridSettings;
  expandedPanelId?: string;
  accessMode: GridAccessMode;
}): {
  gridLayoutStateManager: GridLayoutStateManager;
  setDimensionsRef: (instance: HTMLDivElement | null) => void;
} => {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const panelRefs = useRef<Array<{ [id: string]: HTMLDivElement | null }>>([]);
  const { euiTheme } = useEuiTheme();

  const expandedPanelId$ = useMemo(
    () => new BehaviorSubject<string | undefined>(expandedPanelId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    if (expandedPanelId !== expandedPanelId$.getValue()) expandedPanelId$.next(expandedPanelId);
  }, [expandedPanelId, expandedPanelId$]);

  const accessMode$ = useMemo(
    () => new BehaviorSubject<GridAccessMode>(accessMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    if (accessMode !== accessMode$.getValue()) accessMode$.next(accessMode);
  }, [accessMode, accessMode$]);

  const runtimeSettings$ = useMemo(
    () =>
      new BehaviorSubject<RuntimeGridSettings>(
        gridSettings === 'none'
          ? gridSettings
          : {
              ...gridSettings,
              columnPixelWidth: 0,
            }
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const gridLayoutStateManager = useMemo(() => {
    const resolvedLayout = cloneDeep(layout);
    if (gridSettings !== 'none') {
      resolvedLayout.forEach((row, rowIndex) => {
        resolvedLayout[rowIndex] = resolveGridRow(row);
      });
    }

    const gridLayout$ = new BehaviorSubject<GridLayoutData>(resolvedLayout);
    const proposedGridLayout$ = new BehaviorSubject<GridLayoutData | undefined>(undefined);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const activePanel$ = new BehaviorSubject<ActivePanel | undefined>(undefined);
    const panelIds$ = new BehaviorSubject<string[][]>(
      layout.map(({ panels }) => Object.keys(panels))
    );

    return {
      rowRefs,
      panelRefs,
      panelIds$,
      proposedGridLayout$,
      gridLayout$,
      activePanel$,
      accessMode$,
      gridDimensions$,
      runtimeSettings$,
      interactionEvent$,
      expandedPanelId$,
      isMobileView$: new BehaviorSubject<boolean>(
        shouldShowMobileView(accessMode, euiTheme.breakpoint.m)
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const runtimeSettings = runtimeSettings$.getValue();
    if (runtimeSettings !== 'none' && gridSettings === 'none') {
      // convert grid lock to freeform
      const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
      const newLayout = cloneDeep(currentLayout);

      const dimensions = gridLayoutStateManager.gridDimensions$.getValue();
      const elementWidth = dimensions.width ?? 0;
      const columnPixelWidth = elementWidth / runtimeSettings.columnCount;

      const rowOffsets: { [key: number]: number } = {};
      newLayout.forEach((row, rowIndex) => {
        const { panels } = row;
        const newPanels: {
          [key: string]: GridPanelData;
        } = {};
        getKeysInOrder(panels).forEach((panelId) => {
          const oldPanel = panels[panelId];
          const width = oldPanel.width * columnPixelWidth;
          const rowNum = oldPanel.row * runtimeSettings.rowHeight;

          if (rowOffsets[rowNum] === undefined) {
            rowOffsets[rowNum] = 0;
          }
          newPanels[panelId] = {
            id: panelId,
            column: rowOffsets[rowNum],
            width,
            row: rowNum,
            height: oldPanel.height * runtimeSettings.rowHeight,
          };
          rowOffsets[rowNum] += width;
        });
        newLayout[rowIndex] = { ...newLayout[rowIndex], panels: newPanels };
      });
      runtimeSettings$.next('none');
      gridLayoutStateManager.gridLayout$.next(newLayout);
    } else if (runtimeSettings === 'none' && gridSettings !== 'none') {
      // convert freeform to grid lock
      const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
      const newLayout = cloneDeep(currentLayout);

      const dimensions = gridLayoutStateManager.gridDimensions$.getValue();
      const elementWidth = dimensions.width ?? 0;
      const columnPixelWidth = elementWidth / gridSettings.columnCount;

      newLayout.forEach((row, rowIndex) => {
        const { panels } = row;
        const newPanels: {
          [key: string]: GridPanelData;
        } = {};
        Object.keys(panels).forEach((panelId) => {
          const oldPanel = panels[panelId];
          const column = Math.round(oldPanel.column / columnPixelWidth);
          const width = Math.round(oldPanel.width / columnPixelWidth);
          const rowNum = Math.round(oldPanel.row / gridSettings.rowHeight);
          newPanels[panelId] = {
            id: panelId,
            column: column + width <= gridSettings.columnCount ? column : 0,
            width,
            row: column + width <= gridSettings.columnCount ? rowNum : rowNum + 1,
            height: Math.round(oldPanel.height / gridSettings.rowHeight),
          };
        });
        newLayout[rowIndex] = resolveGridRow({ ...newLayout[rowIndex], panels: newPanels });
      });
      runtimeSettings$.next({
        ...gridSettings,
        columnPixelWidth:
          (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
          gridSettings.columnCount,
      });
      gridLayoutStateManager.gridLayout$.next(newLayout);
    } else if (
      runtimeSettings !== 'none' &&
      gridSettings !== 'none' &&
      !deepEqual(gridSettings, pick(runtimeSettings, ['gutterSize', 'rowHeight', 'columnCount']))
    ) {
      runtimeSettings$.next({
        ...gridSettings,
        columnPixelWidth: runtimeSettings?.columnPixelWidth ?? 0,
      });
    }
  }, [gridSettings, runtimeSettings$, gridLayoutStateManager]);

  useEffect(() => {
    /**
     * debounce width changes to avoid unnecessary column width recalculation.
     */
    const resizeSubscription = combineLatest([gridLayoutStateManager.gridDimensions$, accessMode$])
      .pipe(debounceTime(250))
      .subscribe(([dimensions, currentAccessMode]) => {
        const currentRuntimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
        if (currentRuntimeSettings === 'none') return;

        const elementWidth = dimensions.width ?? 0;
        const columnPixelWidth =
          (elementWidth -
            currentRuntimeSettings.gutterSize * (currentRuntimeSettings.columnCount - 1)) /
          currentRuntimeSettings.columnCount;

        if (columnPixelWidth !== currentRuntimeSettings.columnPixelWidth)
          gridLayoutStateManager.runtimeSettings$.next({
            ...currentRuntimeSettings,
            columnPixelWidth,
          });
        const isMobileView = shouldShowMobileView(currentAccessMode, euiTheme.breakpoint.m);
        if (isMobileView !== gridLayoutStateManager.isMobileView$.getValue()) {
          gridLayoutStateManager.isMobileView$.next(isMobileView);
        }
      });

    /**
     * This subscription sets CSS variables that can be used by `layoutRef` and all of its children
     */
    const cssVariableSubscription = gridLayoutStateManager.runtimeSettings$
      .pipe(distinctUntilChanged(deepEqual))
      .subscribe(({ gutterSize, columnPixelWidth, rowHeight, columnCount }) => {
        if (!layoutRef.current) return;
        layoutRef.current.style.setProperty('--kbnGridGutterSize', `${gutterSize}`);
        layoutRef.current.style.setProperty('--kbnGridRowHeight', `${rowHeight}`);
        layoutRef.current.style.setProperty('--kbnGridColumnWidth', `${columnPixelWidth}`);
        layoutRef.current.style.setProperty('--kbnGridColumnCount', `${columnCount}`);
      });

    return () => {
      resizeSubscription.unsubscribe();
      cssVariableSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: setDimensionsRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      gridLayoutStateManager.gridDimensions$.next(dimensions);
    },
  });

  return { gridLayoutStateManager, setDimensionsRef };
};
