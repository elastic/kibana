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
  layout: GridLayoutData
): { panels: MockedDashboardPanelMap; rows: MockedDashboardRowMap } => {
  const panels: MockedDashboardPanelMap = {};
  const rows: MockedDashboardRowMap = [];
  layout.forEach((row, rowIndex) => {
    rows.push({ title: row.title, collapsed: row.isCollapsed });
    Object.values(row.panels).forEach((panelGridData) => {
      panels[panelGridData.id] = {
        id: panelGridData.id,
        gridData: {
          i: panelGridData.id,
          y: panelGridData.row,
          x: panelGridData.column,
          w: panelGridData.width,
          h: panelGridData.height,
          row: rowIndex,
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
  const layout: GridLayoutData = [];

  rows.forEach((row) => {
    layout.push({ title: row.title, isCollapsed: row.collapsed, panels: {} });
  });

  Object.keys(panels).forEach((panelId) => {
    const gridData = panels[panelId].gridData;
    layout[gridData.row ?? 0].panels[panelId] = {
      id: panelId,
      row: gridData.y,
      column: gridData.x,
      width: gridData.w,
      height: gridData.h,
    };
  });

  return layout;
};
