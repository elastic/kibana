/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridPanelData, GridRowData, OrderedLayout } from './types';
import { getMainLayoutInOrder } from './utils/resolve_grid_row';

export const getOrderedLayout = (layout: GridLayoutData): OrderedLayout => {
  const widgets = getMainLayoutInOrder(layout);
  const orderedLayout: OrderedLayout = {};

  let order = 0;
  let sectionCount = 0;
  for (let i = 0; i < widgets.length; i++) {
    const { type, id } = widgets[i];
    if (type === 'panel') {
      orderedLayout[`main-${sectionCount}`] = {
        id: `main-${sectionCount}`,
        panels: {},
        order,
        isMainSection: true,
      };
      while (widgets[i].type === 'panel') {
        if (i >= widgets.length) break;
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
      sectionCount++;
    }
  }
  return orderedLayout;
};
