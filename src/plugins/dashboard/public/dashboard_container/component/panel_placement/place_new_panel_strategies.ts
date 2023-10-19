/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../dashboard_constants';
import { PanelPlacementProps, PanelPlacementReturn } from './types';

export const panelPlacementStrategies = {
  // Place on the very top of the Dashboard, add the height of this panel to all other panels.
  placeAtTop: ({ width, height, currentPanels }: PanelPlacementProps): PanelPlacementReturn => {
    const otherPanels = { ...currentPanels };
    for (const [id, panel] of Object.entries(currentPanels)) {
      const currentPanel = cloneDeep(panel);
      currentPanel.gridData.y = currentPanel.gridData.y + height;
      otherPanels[id] = currentPanel;
    }
    return {
      newPanelPlacement: { x: 0, y: 0, w: width, h: height },
      otherPanels,
    };
  },

  // Look for the smallest y and x value where the default panel will fit.
  findTopLeftMostOpenSpace: ({
    width,
    height,
    currentPanels,
  }: PanelPlacementProps): PanelPlacementReturn => {
    let maxY = -1;

    const currentPanelsArray = Object.values(currentPanels);
    currentPanelsArray.forEach((panel) => {
      maxY = Math.max(panel.gridData.y + panel.gridData.h, maxY);
    });

    // Handle case of empty grid.
    if (maxY < 0) {
      return {
        newPanelPlacement: { x: 0, y: 0, w: width, h: height },
        otherPanels: currentPanels,
      };
    }

    const grid = new Array(maxY);
    for (let y = 0; y < maxY; y++) {
      grid[y] = new Array(DASHBOARD_GRID_COLUMN_COUNT).fill(0);
    }

    currentPanelsArray.forEach((panel) => {
      for (let x = panel.gridData.x; x < panel.gridData.x + panel.gridData.w; x++) {
        for (let y = panel.gridData.y; y < panel.gridData.y + panel.gridData.h; y++) {
          const row = grid[y];
          if (row === undefined) {
            throw new Error(
              `Attempted to access a row that doesn't exist at ${y} for panel ${JSON.stringify(
                panel
              )}`
            );
          }
          grid[y][x] = 1;
        }
      }
    });

    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < DASHBOARD_GRID_COLUMN_COUNT; x++) {
        if (grid[y][x] === 1) {
          // Space is filled
          continue;
        } else {
          for (let h = y; h < Math.min(y + height, maxY); h++) {
            for (let w = x; w < Math.min(x + width, DASHBOARD_GRID_COLUMN_COUNT); w++) {
              const spaceIsEmpty = grid[h][w] === 0;
              const fitsPanelWidth = w === x + width - 1;
              // If the panel is taller than any other panel in the current grid, it can still fit in the space, hence
              // we check the minimum of maxY and the panel height.
              const fitsPanelHeight = h === Math.min(y + height - 1, maxY - 1);

              if (spaceIsEmpty && fitsPanelWidth && fitsPanelHeight) {
                // Found space
                return {
                  newPanelPlacement: { x, y, w: width, h: height },
                  otherPanels: currentPanels,
                };
              } else if (grid[h][w] === 1) {
                // x, y spot doesn't work, break.
                break;
              }
            }
          }
        }
      }
    }
    return {
      newPanelPlacement: { x: 0, y: maxY, w: width, h: height },
      otherPanels: currentPanels,
    };
  },
} as const;
