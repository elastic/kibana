/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';

import type { GridPanelData } from '../grid_panel';
import type { GridSectionData } from '../grid_section';
import type { GridLayoutData, OrderedLayout } from '../types';
import { getLayoutInOrder, getSectionsInOrder, resolveGridSection } from './resolve_grid_section';

export const getGridLayout = (layout: OrderedLayout): GridLayoutData => {
  let gridLayout: GridLayoutData = {};
  let mainRow = 0;
  getSectionsInOrder(layout).forEach((section) => {
    const panels: { [key: string]: GridPanelData & { type?: 'panel' } } = cloneDeep(
      resolveGridSection(section.panels)
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
      const { order, isMainSection, ...rest } = section;
      gridLayout[section.id] = {
        ...rest,
        type: 'section',
        row: mainRow,
      };
      mainRow++;
    }
  });
  return gridLayout;
};

export const getOrderedLayout = (layout: GridLayoutData): OrderedLayout => {
  const widgets = cloneDeep(getLayoutInOrder(layout));
  const orderedLayout: OrderedLayout = {};
  let order = 0;
  let mainRow = 0;
  for (let i = 0; i < widgets.length; i++) {
    const { type, id } = widgets[i];
    if (type === 'panel') {
      orderedLayout[`main-${order}`] = {
        id: `main-${order}`,
        panels: {},
        order,
        isMainSection: true,
      };
      const startingRow = (layout[widgets[i].id] as GridPanelData).row;
      let maxRow = -Infinity;
      while (i < widgets.length && widgets[i].type === 'panel') {
        const { type: drop, ...panel } = cloneDeep(layout[widgets[i].id]) as GridPanelData & {
          type: 'panel';
        }; // drop type
        panel.row -= startingRow;
        maxRow = Math.max(maxRow, panel.row + panel.height);
        orderedLayout[`main-${order}`].panels[panel.id] = panel;
        i++;
      }
      orderedLayout[`main-${order}`].panels = resolveGridSection(
        orderedLayout[`main-${order}`].panels
      );
      i--;
      mainRow += maxRow;
    } else {
      const sectionId = id;
      const {
        type: drop,
        row,
        ...section
      } = cloneDeep(layout[sectionId]) as GridSectionData & { type: 'section' }; // drop type and row
      orderedLayout[sectionId] = {
        ...section,
        order,
        isMainSection: false,
        panels: resolveGridSection(section.panels),
      };
      mainRow++;
    }
    order++;
  }

  return orderedLayout;
};
