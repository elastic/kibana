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
  currentPanelsArray.forEach(panel => {
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

  currentPanelsArray.forEach(panel => {
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

export function placePanelBeside({
  width,
  height,
  currentPanels,
  placeBesideId,
}: IPanelPlacementBesideArgs): Omit<GridData, 'i'> {
  // const clonedPanels = _.cloneDeep(currentPanels);
  if (!placeBesideId) {
    throw new Error('Place beside method called without placeBesideId');
  }
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
    { grid: { x: beside.x - width, y: beside.y, w: width, h: height }, fits: true }, // left
    { grid: { x: beside.x, y: beside.y + beside.h, w: width, h: height }, fits: true }, // bottom
  ];

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
  const [, , bottomPlacement] = possiblePlacementDirections;
  for (const currentPanelGrid of otherPanels) {
    if (bottomPlacement.grid.y <= currentPanelGrid.y) {
      const movedPanel = _.cloneDeep(currentPanels[currentPanelGrid.i]);
      movedPanel.gridData.y = movedPanel.gridData.y + bottomPlacement.grid.h;
      currentPanels[currentPanelGrid.i] = movedPanel;
    }
  }
  return bottomPlacement.grid;
}
