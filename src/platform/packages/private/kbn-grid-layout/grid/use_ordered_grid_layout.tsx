/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, distinctUntilChanged, map } from 'rxjs';

import { GridLayoutData, GridLayoutStateManager, GridPanelData, GridRowData } from './types';
import { getMainLayoutInOrder } from './utils/resolve_grid_row';

export interface OrderedLayout {
  [key: string]: Omit<GridRowData, 'isCollapsed' | 'title'> &
    (
      | Partial<Pick<GridRowData, 'isCollapsed' | 'title'>>
      | {
          isMainSection: boolean;
        }
    ) & { order: number };
}

export const useOrderedSections = (
  gridLayoutStateManager: GridLayoutStateManager
): BehaviorSubject<OrderedLayout> => {
  const cleanupCallback = useRef<null | (() => void)>();

  const orderedLayout$ = useMemo(() => {
    const layoutSubject = new BehaviorSubject(
      getOrderedLayout(gridLayoutStateManager.gridLayout$.getValue())
    );

    const subscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((layout) => getOrderedLayout(layout)),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((layout) => {
        layoutSubject.next(layout);
      });

    cleanupCallback.current = () => {
      subscription.unsubscribe();
    };

    return layoutSubject;
  }, [gridLayoutStateManager.gridLayout$]);

  useEffect(() => {
    return () => {
      if (cleanupCallback.current) cleanupCallback.current();
    };
  }, []);

  return orderedLayout$;
};

const getOrderedLayout = (layout: GridLayoutData): OrderedLayout => {
  const widgets = getMainLayoutInOrder(layout);
  const orderedLayout: OrderedLayout = {};

  let order = 0;
  let row = 0;
  let sectionCount = 0;
  for (let i = 0; i < widgets.length; i++) {
    const { type, id } = widgets[i];
    if (type === 'panel') {
      orderedLayout[`main-${sectionCount}`] = {
        id: `main-${sectionCount}`,
        panels: {},
        order,
        row,
        isMainSection: true,
      };
      while (widgets[i].type === 'panel') {
        const panel = layout[widgets[i].id] as GridPanelData;
        orderedLayout[`main-${sectionCount}`].panels[panel.id] = panel;
        i++;
      }
      i--;
      order++;
    } else {
      const sectionId = id;
      const section = layout[sectionId] as GridRowData;
      orderedLayout[sectionId] = { ...section, order };
      order++;
      row = section.row;
      sectionCount++;
    }
  }
  return orderedLayout;
};
