/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

import { GridPanelData, GridRowData } from '../types';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { OrderedLayout } from '../use_ordered_grid_layout';
import { isGridDataEqual } from '../utils/equality_checks';

export const useGridPanelState = ({
  panelId,
}: {
  panelId: string;
}): BehaviorSubject<GridPanelData & { rowId: string }> => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const cleanupCallback = useRef<null | (() => void)>();

  const panel$ = useMemo(() => {
    const panelSubject = new BehaviorSubject(
      getPanelState(gridLayoutStateManager.orderedSections$.getValue(), panelId)
    );

    const subscription = gridLayoutStateManager.orderedSections$
      .pipe(
        map((layout) => getPanelState(layout, panelId)),
        distinctUntilChanged(
          (panelA, panelB) => isGridDataEqual(panelA, panelB) && panelA.rowId === panelB.rowId
        )
      )
      .subscribe((panel) => {
        panelSubject.next(panel);
      });

    cleanupCallback.current = () => {
      subscription.unsubscribe();
    };

    return panelSubject;
  }, [gridLayoutStateManager.orderedSections$, panelId]);

  useEffect(() => {
    return () => {
      if (cleanupCallback.current) cleanupCallback.current();
    };
  }, []);

  return panel$;
};

const getPanelState = (layout: OrderedLayout, panelId: string) => {
  const flattenedPanels: { [id: string]: GridPanelData & { rowId: string } } = {};
  Object.values(layout).forEach((section) => {
    const startingRow = section.isMainSection && section.order !== 0 ? section.row + 1 : 0;
    Object.values((section as GridRowData).panels).forEach((panel) => {
      flattenedPanels[panel.id] = { ...panel, rowId: section.id, row: panel.row - startingRow };
    });
  });
  // console.log({ flattenedPanels });
  return flattenedPanels[panelId];
};
