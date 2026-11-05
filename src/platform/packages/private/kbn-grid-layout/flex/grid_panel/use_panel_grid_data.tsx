/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged, filter, map } from 'rxjs';

import { useGridLayoutContext } from '../use_grid_layout_context';
import type { FlexPanelData } from './types';
import type { FlexLayoutData } from '../types';

export const useGridPanelState = ({
  panelId,
}: {
  panelId: string;
}): BehaviorSubject<FlexPanelData | undefined> => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const cleanupCallback = useRef<null | (() => void)>();

  const panel$ = useMemo(() => {
    const panelSubject = new BehaviorSubject(
      getPanelState(gridLayoutStateManager.gridLayout$.getValue(), panelId)
    );

    const subscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((layout) => getPanelState(layout, panelId)),
        // filter out undefined panels
        filter(nonNullable),
        distinctUntilChanged((panelA, panelB) => isEqual(panelA, panelB))
      )
      .subscribe((panel) => {
        panelSubject.next(panel);
      });

    cleanupCallback.current = () => {
      subscription.unsubscribe();
    };

    return panelSubject;
  }, [gridLayoutStateManager.gridLayout$, panelId]);

  useEffect(() => {
    return () => {
      if (cleanupCallback.current) cleanupCallback.current();
    };
  }, []);

  return panel$;
};

const getPanelState = (layout: FlexLayoutData, panelId: string): FlexPanelData | undefined => {
  return layout[panelId];
};

function nonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}
