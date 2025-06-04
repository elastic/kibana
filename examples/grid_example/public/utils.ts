/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GridLayoutData, GridSectionData } from '@kbn/grid-layout';
import { MockedDashboardPanelMap, MockedDashboardSectionMap } from './types';

export const gridLayoutToDashboardPanelMap = (
  panelState: MockedDashboardPanelMap,
  layout: GridLayoutData
): { panels: MockedDashboardPanelMap; sections: MockedDashboardSectionMap } => {
  const panels: MockedDashboardPanelMap = {};
  const sections: MockedDashboardSectionMap = {};
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
      sections[widgetId] = { ...rest, y: row, collapsed: isCollapsed };
      Object.values(rowPanels).forEach((panelGridData) => {
        panels[panelGridData.id] = {
          ...panelState[panelGridData.id],
          gridData: {
            i: panelGridData.id,
            y: panelGridData.row,
            x: panelGridData.column,
            w: panelGridData.width,
            h: panelGridData.height,
            section: widgetId,
          },
        };
      });
    }
  });

  return { panels, sections };
};

export const dashboardInputToGridLayout = ({
  panels,
  sections,
}: {
  panels: MockedDashboardPanelMap;
  sections: MockedDashboardSectionMap;
}): GridLayoutData => {
  const layout: GridLayoutData = {};
  Object.values(sections).forEach((row) => {
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
    const panelData = {
      id: panelId,
      row: gridData.y,
      column: gridData.x,
      width: gridData.w,
      height: gridData.h,
    };
    if (gridData.section) {
      (layout[gridData.section] as GridSectionData).panels[panelId] = panelData;
    } else {
      layout[panelId] = { type: 'panel', ...panelData };
    }
  });

  return layout;
};
