/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import type { Observable } from 'rxjs';
import { BehaviorSubject, combineLatest, distinctUntilChanged, filter, map, Subject } from 'rxjs';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';

import { getScrollContainer } from '@kbn/core-chrome-layout-utils';

import type { ActivePanelEvent } from './grid_panel';
import type {
  FlexKeyboardInteraction,
  FlexLayoutData,
  FlexLayoutStateManager,
  GridAccessMode,
  GridSettings,
} from './types';

export const useGridLayoutState = ({
  layout,
  layoutRef,
  gridSettings,
  accessMode,
}: {
  layout: FlexLayoutData;
  layoutRef: React.MutableRefObject<HTMLDivElement | null>;
  gridSettings: GridSettings;
  accessMode: GridAccessMode;
}): {
  gridLayoutStateManager: FlexLayoutStateManager;
  setDimensionsRef: (instance: HTMLDivElement | null) => void;
} => {
  const panelRefs = useRef<{ [panelId: string]: HTMLDivElement | null }>({});

  const accessMode$ = useMemo(
    () => new BehaviorSubject<GridAccessMode>(accessMode),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    if (accessMode !== accessMode$.getValue()) accessMode$.next(accessMode);
  }, [accessMode, accessMode$]);

  const gridSettings$ = useMemo(
    () => new BehaviorSubject<GridSettings>(gridSettings),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  useEffect(() => {
    if (!deepEqual(gridSettings, gridSettings$.getValue())) gridSettings$.next(gridSettings);
  }, [gridSettings, gridSettings$]);

  const gridLayoutStateManager = useMemo(() => {
    const gridLayout$ = new BehaviorSubject<FlexLayoutData>(layout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const scrollContainer$ = new BehaviorSubject(getScrollContainer());
    const activePanelEvent$ = new BehaviorSubject<ActivePanelEvent | undefined>(undefined);

    const layoutUpdated$: Observable<FlexLayoutData> = combineLatest([
      gridLayout$,
      activePanelEvent$,
    ]).pipe(
      // if an interaction event is happening, then ignore any "draft" layout changes
      filter(([_, event]) => !Boolean(event)),
      map(([currentLayout]) => currentLayout),
      // only emit if the layout has changed
      distinctUntilChanged(isEqual)
    );

    return {
      layoutRef,
      panelRefs,
      gridLayout$,
      activePanelEvent$,
      accessMode$,
      gridDimensions$,
      gridSettings$,
      scrollContainer$,
      layoutUpdated$,
      keyboardInteraction$: new Subject<FlexKeyboardInteraction>(),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    /**
     * This subscription sets CSS variables that can be used by `layoutRef` and all of its children
     */
    const cssVariableSubscription = gridSettings$
      .pipe(distinctUntilChanged(deepEqual))
      .subscribe(({ gutterSize, rowHeight }) => {
        if (!layoutRef.current) return;
        layoutRef.current.style.setProperty('--kbnFlexGutterSize', `${gutterSize}`);
        layoutRef.current.style.setProperty('--kbnFlexRowHeight', `${rowHeight}`);
      });

    return () => {
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
