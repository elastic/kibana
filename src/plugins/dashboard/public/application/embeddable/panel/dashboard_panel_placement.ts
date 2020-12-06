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
import { PanelNotFoundError } from '../../../embeddable_plugin';
import { GridData } from '../../../../common';
import { DashboardPanelState, DASHBOARD_GRID_COLUMN_COUNT } from '..';

export type PanelPlacementMethod<PlacementArgs extends IPanelPlacementArgs> = (
  args: PlacementArgs
) => Omit<GridData, 'i'>;

export interface IPanelPlacementArgs {
  width: number;
  height: number;
  currentPanels: { [key: string]: DashboardPanelState };
}

export interface IPanelPlacementBesideArgs extends IPanelPlacementArgs {
  placeBesideId: string;
}

// Look for the smallest y and x value where the default panel will fit.
export function findTopLeftMostOpenSpace({
  width,
  height,
  currentPanels,
}: IPanelPlacementArgs): Omit<GridData, 'i'> {
  let maxY = -1;

  const currentPanelsArray = Object.values(currentPanels);
  currentPanelsArray.forEach((panel) => {
    maxY = Math.max(panel.gridData.y + panel.gridData.h, maxY);
  });

  // Handle case of empty grid.
  if (maxY < 0) {
    return { x: 0, y: 0, w: width, h: height };
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
              return { x, y, w: width, h: height };
            } else if (grid[h][w] === 1) {
              // x, y spot doesn't work, break.
              break;
            }
          }
        }
      }
    }
  }
  return { x: 0, y: maxY, w: width, h: height };
}

interface IplacementDirection {
  grid: Omit<GridData, 'i'>;
  fits: boolean;
}

/**
 * Compare grid data by an ending y coordinate. Grid data with a smaller ending y coordinate
 * comes first.
 * @param a
 * @param b
 */
function comparePanels(a: GridData, b: GridData): number {
  if (a.y + a.h < b.y + b.h) {
    return -1;
  }
  if (a.y + a.h > b.y + b.h) {
    return 1;
  }
  // a.y === b.y
  if (a.x + a.w <= b.x + b.w) {
    return -1;
  }
  return 1;
}

export function placePanelBeside({
  width,
  height,
  currentPanels,
  placeBesideId,
}: IPanelPlacementBesideArgs): Omit<GridData, 'i'> {
  const panelToPlaceBeside = currentPanels[placeBesideId];
  if (!panelToPlaceBeside) {
    throw new PanelNotFoundError();
  }
  const beside = panelToPlaceBeside.gridData;
  const otherPanels: GridData[] = [];
  _.forOwn(currentPanels, (panel: DashboardPanelState, key: string | undefined) => {
    otherPanels.push(panel.gridData);
  });

  const possiblePlacementDirections: IplacementDirection[] = [
    { grid: { x: beside.x + beside.w, y: beside.y, w: width, h: height }, fits: true }, // right
    { grid: { x: 0, y: beside.y + beside.h, w: width, h: height }, fits: true }, // left side of next row
    { grid: { x: beside.x, y: beside.y + beside.h, w: width, h: height }, fits: true }, // bottom
  ];

  // first, we check if there is place around the current panel
  for (const direction of possiblePlacementDirections) {
    if (
      direction.grid.x >= 0 &&
      direction.grid.x + direction.grid.w <= DASHBOARD_GRID_COLUMN_COUNT &&
      direction.grid.y >= 0
    ) {
      const intersection = otherPanels.some((currentPanelGrid: GridData) => {
        return (
          direction.grid.x + direction.grid.w > currentPanelGrid.x &&
          direction.grid.x < currentPanelGrid.x + currentPanelGrid.w &&
          direction.grid.y < currentPanelGrid.y + currentPanelGrid.h &&
          direction.grid.y + direction.grid.h > currentPanelGrid.y
        );
      });
      if (!intersection) {
        return direction.grid;
      }
    } else {
      direction.fits = false;
    }
  }
  // if we get here that means there is no blank space around the panel we are placing beside. This means it's time to mess up the dashboard's groove. Fun!
  /**
   * 1. sort the panels in the grid
   * 2. place the cloned panel to the bottom
   * 3. reposition the panels after the cloned panel in the grid
   */
  const grid = otherPanels.sort(comparePanels);

  let position = 0;
  for (position; position < grid.length; position++) {
    if (beside.i === grid[position].i) {
      break;
    }
  }
  const bottomPlacement = possiblePlacementDirections[2];
  // place to the bottom and move all other panels
  let originalPositionInTheGrid = grid[position + 1].i;
  const diff =
    bottomPlacement.grid.y +
    bottomPlacement.grid.h -
    currentPanels[originalPositionInTheGrid].gridData.y;

  for (let j = position + 1; j < grid.length; j++) {
    originalPositionInTheGrid = grid[j].i;
    const movedPanel = _.cloneDeep(currentPanels[originalPositionInTheGrid]);
    movedPanel.gridData.y = movedPanel.gridData.y + diff;
    currentPanels[originalPositionInTheGrid] = movedPanel;
  }
  return bottomPlacement.grid;
}
