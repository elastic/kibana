/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { cloneDeep } from 'lodash';
import { PlacementStrategy } from '@kbn/embeddable-plugin/public';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../common/page_bundle_constants';
import type { PanelPlacementProps, PanelPlacementReturn } from './types';
import type { DashboardLayoutPanel } from '../dashboard_api/layout_manager';

export const runPanelPlacementStrategy = (
  strategy: PlacementStrategy,
  { panel: newPanel, currentLayout, beside }: PanelPlacementProps
): PanelPlacementReturn => {
  let targetPanel: DashboardLayoutPanel | undefined;
  const { panels: currentPanels, sections: currentSections } = currentLayout;
  const { w: width, h: height, sectionId } = newPanel.grid;
  if (beside) {
    targetPanel = currentPanels[beside];
  }
  switch (strategy) {
    case PlacementStrategy.placeAtTop:
      const otherPanels = { ...currentPanels };
      const otherSections = { ...currentSections };

      // push all sections down
      for (const [id, section] of Object.entries({ ...currentSections })) {
        otherSections[id] = { ...section, grid: { y: section.grid.y + height } };
      }

      // push relative panels down
      for (const [id, panel] of Object.entries({ ...currentPanels })) {
        // only consider collisions with panels in the same section
        if (!sectionId || panel.grid.sectionId === sectionId) {
          const { grid, ...currentPanel } = cloneDeep(panel);
          if (!targetPanel || grid.y >= targetPanel.grid.y) {
            // if a target panel is provided, only push down panels in the same row and below
            const newGridData = { ...grid, y: grid.y + height };
            otherPanels[id] = { ...currentPanel, grid: newGridData };
          }
        }
      }

      return {
        ...currentLayout,
        sections: otherSections,
        panels: {
          ...otherPanels,
          [newPanel.uuid]: {
            type: newPanel.type,
            grid: targetPanel
              ? {
                  ...newPanel.grid,
                  x: targetPanel.grid.x,
                  y: targetPanel.grid.y,
                  w: width,
                  h: height,
                }
              : { ...newPanel.grid, x: 0, y: 0, w: width, h: height },
          },
        },
      };

    case PlacementStrategy.findTopLeftMostOpenSpace:
      let maxY = -1;

      const currentPanelsArray = Object.values(currentPanels);
      currentPanelsArray.forEach((panel) => {
        // only consider panels in the same section when calculating maxY
        if (panel.grid.sectionId === sectionId) {
          maxY = Math.max(panel.grid.y + panel.grid.h, maxY);
        }
      });

      // Handle case of empty grid.
      if (maxY < 0) {
        return {
          ...currentLayout,
          panels: {
            [newPanel.uuid]: { type: newPanel.type, grid: { x: 0, y: 0, w: width, h: height } },
          },
        };
      }

      const grid = new Array(maxY);
      for (let y = 0; y < maxY; y++) {
        grid[y] = new Array(DASHBOARD_GRID_COLUMN_COUNT).fill(0);
      }

      currentPanelsArray.forEach((panel) => {
        if (panel.grid.sectionId === sectionId) {
          for (let x = panel.grid.x; x < panel.grid.x + panel.grid.w; x++) {
            for (let y = panel.grid.y; y < panel.grid.y + panel.grid.h; y++) {
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
        }
      });

      for (let y = targetPanel?.grid.y ?? 0; y < maxY; y++) {
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
                    ...currentLayout,
                    panels: {
                      ...currentPanels,
                      [newPanel.uuid]: { type: newPanel.type, grid: { x, y, w: width, h: height } },
                    },
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
        ...currentLayout,
        panels: {
          ...currentPanels,
          [newPanel.uuid]: { type: newPanel.type, grid: { x: 0, y: maxY, w: width, h: height } },
        },
      };
    default:
      throw new Error(
        i18n.translate('dashboard.panelPlacement.unknownStrategyError', {
          defaultMessage: 'Unknown panel placement strategy: {strategy}',
          values: { strategy },
        })
      );
  }
};
