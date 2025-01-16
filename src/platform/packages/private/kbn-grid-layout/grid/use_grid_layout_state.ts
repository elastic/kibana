/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { cloneDeep, pick } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime } from 'rxjs';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';

import { useEuiTheme } from '@elastic/eui';

import {
  ActivePanel,
  GridAccessMode,
  GridLayoutData,
  GridLayoutStateManager,
  GridSettings,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';
import { shouldShowMobileView } from './utils/mobile_view';
import { resolveGridRow } from './utils/resolve_grid_row';

export const useGridLayoutState = ({
  layout,
  gridSettings,
  expandedPanelId,
  accessMode,
}: {
  layout: GridLayoutData;
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
      new BehaviorSubject<RuntimeGridSettings>({
        ...gridSettings,
        columnPixelWidth: 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const runtimeSettings = runtimeSettings$.getValue();
    if (!deepEqual(gridSettings, pick(runtimeSettings, ['gutterSize', 'rowHeight', 'columnCount'])))
      runtimeSettings$.next({
        ...gridSettings,
        columnPixelWidth: runtimeSettings.columnPixelWidth,
      });
  }, [gridSettings, runtimeSettings$]);

  const gridLayoutStateManager = useMemo(() => {
    const resolvedLayout = cloneDeep(layout);
    resolvedLayout.forEach((row, rowIndex) => {
      resolvedLayout[rowIndex] = resolveGridRow(row);
    });

    const gridLayout$ = new BehaviorSubject<GridLayoutData>(resolvedLayout);
    const stableGridLayout$ = new BehaviorSubject<GridLayoutData>(cloneDeep(resolvedLayout));
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
      gridLayout$,
      stableGridLayout$,
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
    /**
     * debounce width changes to avoid unnecessary column width recalculation.
     */
    const resizeSubscription = combineLatest([gridLayoutStateManager.gridDimensions$, accessMode$])
      .pipe(debounceTime(250))
      .subscribe(([dimensions, currentAccessMode]) => {
        const currentRuntimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
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

    return () => {
      resizeSubscription.unsubscribe();
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
