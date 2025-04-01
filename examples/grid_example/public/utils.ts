/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData } from '@kbn/grid-layout';
import { MockedDashboardPanelMap, MockedDashboardRowMap } from './types';

export const gridLayoutToDashboardPanelMap = (
  panelState: MockedDashboardPanelMap,
  layout: GridLayoutData
): { panels: MockedDashboardPanelMap; rows: MockedDashboardRowMap } => {
  const panels: MockedDashboardPanelMap = {};
  const rows: MockedDashboardRowMap = {};
  Object.entries(layout).forEach(([rowId, row]) => {
    const { panels: rowPanels, isCollapsed, ...rest } = row; // drop panels
    rows[rowId] = { ...rest, collapsed: isCollapsed };
    Object.values(rowPanels).forEach((panelGridData) => {
      panels[panelGridData.id] = {
        ...panelState[panelGridData.id],
        gridData: {
          i: panelGridData.id,
          y: panelGridData.row,
          x: panelGridData.column,
          w: panelGridData.width,
          h: panelGridData.height,
          row: rowId,
        },
      };
    });
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
    const { collapsed, ...rest } = row;
    layout[row.id] = {
      ...rest,
      panels: {},
      isCollapsed: collapsed,
    };
  });

  Object.keys(panels).forEach((panelId) => {
    const gridData = panels[panelId].gridData;
    layout[gridData.row ?? 'first'].panels[panelId] = {
      id: panelId,
      row: gridData.y,
      column: gridData.x,
      width: gridData.w,
      height: gridData.h,
    };
  });

  return layout;
};
