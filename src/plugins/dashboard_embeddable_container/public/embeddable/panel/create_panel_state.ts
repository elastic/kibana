/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import _ from 'lodash';
import { PanelState, EmbeddableInput } from '../../embeddable_plugin';
import {
  DASHBOARD_GRID_COLUMN_COUNT,
  DEFAULT_PANEL_HEIGHT,
  DEFAULT_PANEL_WIDTH,
} from '../dashboard_constants';
import { DashboardPanelState } from '../types';

// Look for the smallest y and x value where the default panel will fit.
function findTopLeftMostOpenSpace(
  width: number,
  height: number,
  currentPanels: DashboardPanelState[]
) {
  let maxY = -1;

  currentPanels.forEach(panel => {
    maxY = Math.max(panel.gridData.y + panel.gridData.h, maxY);
  });

  // Handle case of empty grid.
  if (maxY < 0) {
    return { x: 0, y: 0 };
  }

  const grid = new Array(maxY);
  for (let y = 0; y < maxY; y++) {
    grid[y] = new Array(DASHBOARD_GRID_COLUMN_COUNT).fill(0);
  }

  currentPanels.forEach(panel => {
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
              return { x, y };
            } else if (grid[h][w] === 1) {
              // x, y spot doesn't work, break.
              break;
            }
          }
        }
      }
    }
  }
  return { x: 0, y: maxY };
}

/**
 * Creates and initializes a basic panel state.
 */
export function createPanelState<TEmbeddableInput extends EmbeddableInput>(
  panelState: PanelState<TEmbeddableInput>,
  currentPanels: DashboardPanelState[]
): DashboardPanelState<TEmbeddableInput> {
  const { x, y } = findTopLeftMostOpenSpace(
    DEFAULT_PANEL_WIDTH,
    DEFAULT_PANEL_HEIGHT,
    currentPanels
  );
  return {
    gridData: {
      w: DEFAULT_PANEL_WIDTH,
      h: DEFAULT_PANEL_HEIGHT,
      x,
      y,
      i: panelState.explicitInput.id,
    },
    ...panelState,
  };
}
