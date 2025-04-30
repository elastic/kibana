/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, omit } from 'lodash';
import { GridLayoutData, GridPanelData, GridRowData, OrderedLayout } from '../types';
import { getMainLayoutInOrder } from './resolve_grid_row';

export const getGridLayout = (layout: OrderedLayout): GridLayoutData => {
  let gridLayout: GridLayoutData = {};
  let mainRow = 0;
  Object.values(layout)
    .sort(({ order: orderA }, { order: orderB }) => {
      return orderA - orderB;
    })
    .forEach((section) => {
      const panels: { [key: string]: GridPanelData & { type?: 'panel' } } = cloneDeep(
        (section as unknown as GridRowData).panels
      );
      if (section.isMainSection) {
        const panelValues = Object.values(panels);
        const maxRow =
          panelValues.length > 0
            ? Math.max(...panelValues.map(({ row, height }) => row + height))
            : 0;
        panelValues.forEach((panel: GridPanelData & { type?: 'panel' }) => {
          panel.row += mainRow;
          panel.type = 'panel';
        });
        gridLayout = { ...gridLayout, ...panels } as GridLayoutData;
        mainRow += maxRow;
      } else {
        const typedSection = section as unknown as GridRowData;
        gridLayout[section.id] = {
          ...omit(typedSection, 'order'),
          type: 'section',
          row: mainRow,
        };
        mainRow++;
      }
    });
  return gridLayout;
};

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
      const startingRow = (layout[widgets[i].id] as GridPanelData).row;
      while (i < widgets.length && widgets[i].type === 'panel') {
        if (i >= widgets.length) break;
        const panel = layout[widgets[i].id] as GridPanelData;
        panel.row -= startingRow;
        orderedLayout[`main-${sectionCount}`].panels[panel.id] = panel;
        i++;
      }
      i--;
      order++;
    } else {
      const sectionId = id;
      const section = layout[sectionId] as GridRowData;
      orderedLayout[sectionId] = { ...omit(section, 'row'), order };
      order++;
      sectionCount++;
    }
  }

  return orderedLayout;
};
