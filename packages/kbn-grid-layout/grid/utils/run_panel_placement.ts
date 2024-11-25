/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { i18n } from '@kbn/i18n';
import { GridRowData } from '../..';
import { GridPanelData, PanelPlacementStrategy } from '../types';
import { compactGridRow, resolveGridRow } from './resolve_grid_row';

export const runPanelPlacementStrategy = (
  originalRowData: GridRowData,
  newPanel: Omit<GridPanelData, 'row' | 'column'>,
  columnCount: number,
  strategy: PanelPlacementStrategy = PanelPlacementStrategy.findTopLeftMostOpenSpace
): GridRowData => {
  const nextRowData = { ...originalRowData, panels: { ...originalRowData.panels } }; // prevent mutation of original row object
  switch (strategy) {
    case PanelPlacementStrategy.placeAtTop:
      // move all other panels down by the height of the new panel to make room for the new panel
      Object.keys(nextRowData.panels).forEach((key) => {
        const panel = nextRowData.panels[key];
        panel.row += newPanel.height;
      });

      // some panels might need to be pushed back up because they are now floating - so, compact the row
      return compactGridRow({
        ...nextRowData,
        // place the new panel at the top left corner, since there is now space
        panels: { ...nextRowData.panels, [newPanel.id]: { ...newPanel, row: 0, column: 0 } },
      });

    case PanelPlacementStrategy.findTopLeftMostOpenSpace:
      // find the max row
      let maxRow = -1;
      const currentPanelsArray = Object.values(nextRowData.panels);
      currentPanelsArray.forEach((panel) => {
        maxRow = Math.max(panel.row + panel.height, maxRow);
      });

      // handle case of empty grid by placing the panel at the top left corner
      if (maxRow < 0) {
        return {
          ...nextRowData,
          panels: { [newPanel.id]: { ...newPanel, row: 0, column: 0 } },
        };
      }

      // find a spot in the grid where the entire panel will fit
      const { row, column } = (() => {
        // create a 2D array representation of the grid filled with zeros
        const grid = new Array(maxRow);
        for (let y = 0; y < maxRow; y++) {
          grid[y] = new Array(columnCount).fill(0);
        }

        // fill in the 2D array with ones wherever a panel is
        currentPanelsArray.forEach((panel) => {
          for (let x = panel.column; x < panel.column + panel.width; x++) {
            for (let y = panel.row; y < panel.row + panel.height; y++) {
              grid[y][x] = 1;
            }
          }
        });

        // now find the first empty spot where there are enough zeros (unoccupied spaces) to fit the whole panel
        for (let y = 0; y < maxRow; y++) {
          for (let x = 0; x < columnCount; x++) {
            if (grid[y][x] === 1) {
              // space is filled, so skip this spot
              continue;
            } else {
              for (let h = y; h < Math.min(y + newPanel.height, maxRow); h++) {
                for (let w = x; w < Math.min(x + newPanel.width, columnCount); w++) {
                  const spaceIsEmpty = grid[h][w] === 0;
                  const fitsPanelWidth = w === x + newPanel.width - 1;
                  // if the panel is taller than any other panel in the current grid, it can still fit in the space, hence
                  // we check the minimum of maxY and the panel height.
                  const fitsPanelHeight = h === Math.min(y + newPanel.height - 1, maxRow - 1);

                  if (spaceIsEmpty && fitsPanelWidth && fitsPanelHeight) {
                    // found an empty space where the entire panel will fit
                    return { column: x, row: y };
                  } else if (grid[h][w] === 1) {
                    // x, y is already occupied - break out of the loop and move on to the next starting point
                    break;
                  }
                }
              }
            }
          }
        }

        return { column: 0, row: maxRow };
      })();

      // some panels might need to be pushed down to accomodate the height of the new panel;
      // so, resolve the entire row to remove any potential collisions
      return resolveGridRow({
        ...nextRowData,
        // place the new panel at the top left corner, since there is now space
        panels: { ...nextRowData.panels, [newPanel.id]: { ...newPanel, row, column } },
      });

    default:
      throw new Error(
        i18n.translate('kbnGridLayout.panelPlacement.unknownStrategyError', {
          defaultMessage: 'Unknown panel placement strategy: {strategy}',
          values: { strategy },
        })
      );
  }
};
