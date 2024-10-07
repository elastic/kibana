/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, forOwn } from 'lodash';
import { PanelNotFoundError } from '@kbn/embeddable-plugin/public';

import { DashboardPanelState } from '../../../common';
import type { GridData } from '../../../server/content_management';
import { PanelPlacementProps, PanelPlacementReturn } from './types';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../dashboard_constants';

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

export function placeClonePanel({
  width,
  height,
  currentPanels,
  placeBesideId,
}: PanelPlacementProps & { placeBesideId: string }): PanelPlacementReturn {
  const panelToPlaceBeside = currentPanels[placeBesideId];
  if (!panelToPlaceBeside) {
    throw new PanelNotFoundError();
  }
  const beside = panelToPlaceBeside.gridData;
  const otherPanelGridData: GridData[] = [];
  forOwn(currentPanels, (panel: DashboardPanelState, key: string | undefined) => {
    otherPanelGridData.push(panel.gridData);
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
      const intersection = otherPanelGridData.some((currentPanelGrid: GridData) => {
        return (
          direction.grid.x + direction.grid.w > currentPanelGrid.x &&
          direction.grid.x < currentPanelGrid.x + currentPanelGrid.w &&
          direction.grid.y < currentPanelGrid.y + currentPanelGrid.h &&
          direction.grid.y + direction.grid.h > currentPanelGrid.y
        );
      });
      if (!intersection) {
        return { newPanelPlacement: direction.grid, otherPanels: currentPanels };
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
  const otherPanels = { ...currentPanels };
  const grid = otherPanelGridData.sort(comparePanels);

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
    otherPanels[originalPositionInTheGrid].gridData.y;

  for (let j = position + 1; j < grid.length; j++) {
    originalPositionInTheGrid = grid[j].i;
    const movedPanel = cloneDeep(otherPanels[originalPositionInTheGrid]);
    movedPanel.gridData.y = movedPanel.gridData.y + diff;
    otherPanels[originalPositionInTheGrid] = movedPanel;
  }
  return { newPanelPlacement: bottomPlacement.grid, otherPanels };
}
