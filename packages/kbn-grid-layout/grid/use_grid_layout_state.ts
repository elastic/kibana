/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, debounceTime } from 'rxjs';

import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';

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

  const expandedPanelId$ = useMemo(
    () => new BehaviorSubject<string | undefined>(expandedPanelId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    expandedPanelId$.next(expandedPanelId);
  }, [expandedPanelId, expandedPanelId$]);

  const accessMode$ = useMemo(
    () => new BehaviorSubject<GridAccessMode>(accessMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    accessMode$.next(accessMode);
  }, [accessMode, accessMode$]);

  const gridLayoutStateManager = useMemo(() => {
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(layout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const activePanel$ = new BehaviorSubject<ActivePanel | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });
    const panelIds$ = new BehaviorSubject<string[][]>(
      layout.map(({ panels }) => Object.keys(panels))
    );

    return {
      rowRefs,
      panelRefs,
      panelIds$,
      gridLayout$,
      activePanel$,
      gridDimensions$,
      runtimeSettings$,
      interactionEvent$,
      expandedPanelId$,
      isMobileView$: new BehaviorSubject<boolean>(
        accessMode$.getValue() === 'VIEW' && shouldShowMobileView()
      ),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    /**
     * debounce width changes to avoid unnecessary column width recalculation.
     */
    const resizeSubscription = gridLayoutStateManager.gridDimensions$
      .pipe(debounceTime(250))
      .subscribe((dimensions) => {
        const elementWidth = dimensions.width ?? 0;
        const columnPixelWidth =
          (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
          gridSettings.columnCount;

        gridLayoutStateManager.runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
        gridLayoutStateManager.isMobileView$.next(
          accessMode$.getValue() === 'VIEW' && shouldShowMobileView()
        );
      });

    return () => {
      resizeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: setDimensionsRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      console.log('on resize', dimensions);
      gridLayoutStateManager.gridDimensions$.next(dimensions);
    },
  });

  return { gridLayoutStateManager, setDimensionsRef };
};
