/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged, filter, map } from 'rxjs';

import { useFlexLayoutContext } from '../use_flex_layout_context';
import type { FlexPanelData } from './types';
import { nonNullable } from '../../common/utils';
import { isFlexPanelDataEqual } from '../utils/equality_checks';

export const usePanelState = ({
  panelId,
}: {
  panelId: string;
}): BehaviorSubject<FlexPanelData | undefined> => {
  const { gridLayoutStateManager } = useFlexLayoutContext();
  const cleanupCallback = useRef<null | (() => void)>();

  const panel$ = useMemo(() => {
    const panelSubject = new BehaviorSubject<FlexPanelData | undefined>(
      gridLayoutStateManager.gridLayout$.getValue()[panelId]
    );

    const subscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((layout): FlexPanelData | undefined => layout[panelId]),
        // filter out undefined panels
        filter(nonNullable),
        distinctUntilChanged(isFlexPanelDataEqual)
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
