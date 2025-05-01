/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridSectionData } from '@kbn/grid-layout';
import { MockedDashboardPanelMap, MockedDashboardRowMap } from './types';

export const gridLayoutToDashboardPanelMap = (
  panelState: MockedDashboardPanelMap,
  layout: GridLayoutData
): { panels: MockedDashboardPanelMap; rows: MockedDashboardRowMap } => {
  const panels: MockedDashboardPanelMap = {};
  const rows: MockedDashboardRowMap = {};
  Object.entries(layout).forEach(([widgetId, widget]) => {
    if (widget.type === 'panel') {
      const panelGridData = widget;
      panels[panelGridData.id] = {
        ...panelState[panelGridData.id],
        gridData: {
          i: panelGridData.id,
          y: panelGridData.row,
          x: panelGridData.column,
          w: panelGridData.width,
          h: panelGridData.height,
        },
      };
    } else {
      const { panels: rowPanels, type, isCollapsed, row, ...rest } = widget; // drop panels and type
      rows[widgetId] = { ...rest, y: row, collapsed: isCollapsed };
      Object.values(rowPanels).forEach((panelGridData) => {
        panels[panelGridData.id] = {
          ...panelState[panelGridData.id],
          gridData: {
            i: panelGridData.id,
            y: panelGridData.row,
            x: panelGridData.column,
            w: panelGridData.width,
            h: panelGridData.height,
            row: widgetId,
          },
        };
      });
    }
  });

  return { panels, rows };
};

export const dashboardInputToGridLayout = ({
  panels,
  rows,
}: {
  panels: MockedDashboardPanelMap;
  rows: MockedDashboardRowMap;
}): GridLayoutData => {
  const layout: GridLayoutData = {};
  Object.values(rows).forEach((row) => {
    const { collapsed, y, ...rest } = row;
    layout[row.id] = {
      ...rest,
      type: 'section',
      row: y,
      panels: {},
      isCollapsed: collapsed,
    };
  });

  Object.keys(panels).forEach((panelId) => {
    const gridData = panels[panelId].gridData;
    if (gridData.row) {
      (layout[gridData.row] as GridSectionData).panels[panelId] = {
        id: panelId,
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
      };
    } else {
      layout[panelId] = {
        id: panelId,
        type: 'panel',
        row: gridData.y,
        column: gridData.x,
        width: gridData.w,
        height: gridData.h,
      };
    }
  });

  return layout;
};
