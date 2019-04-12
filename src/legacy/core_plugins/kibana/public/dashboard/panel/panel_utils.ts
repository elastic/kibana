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

import { i18n } from '@kbn/i18n';
import _ from 'lodash';
import chrome from 'ui/chrome';
import { DASHBOARD_GRID_COLUMN_COUNT } from '../../../../dashboard_embeddable/public';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from '../dashboard_constants';
import { GridData, Pre61SavedDashboardPanel, SavedDashboardPanel } from '../types';

const PANEL_HEIGHT_SCALE_FACTOR = 5;
const PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS = 4;
const PANEL_WIDTH_SCALE_FACTOR = 4;

export interface SemanticVersion {
  major: number;
  minor: number;
}

// 6.1 switched from gridster to react grid. React grid uses different variables for tracking layout
// eslint-disable-next-line @typescript-eslint/camelcase
export function convertPanelDataPre_6_1(panel: Pre61SavedDashboardPanel): SavedDashboardPanel {
  ['col', 'row'].forEach(key => {
    if (!_.has(panel, key)) {
      throw new Error(
        i18n.translate('kbn.dashboard.panel.unableToMigratePanelDataForSixOneZeroErrorMessage', {
          defaultMessage:
            'Unable to migrate panel data for "6.1.0" backwards compatibility, panel does not contain expected field: {key}',
          values: { key },
        })
      );
    }
  });

  return {
    gridData: {
      x: panel.col - 1,
      y: panel.row - 1,
      w: panel.size_x || DEFAULT_PANEL_WIDTH,
      h: panel.size_y || DEFAULT_PANEL_HEIGHT,
      i: panel.panelIndex.toString(),
    },
    version: chrome.getKibanaVersion(),
    panelIndex: panel.panelIndex.toString(),
    id: panel.id,
    type: panel.type,
    embeddableConfig: {},
  };
}

// 6.3 changed the panel dimensions to allow finer control over sizing
// 1) decrease column height from 100 to 20.
// 2) increase rows from 12 to 48
// Need to scale pre 6.3 panels so they maintain the same layout
// eslint-disable-next-line @typescript-eslint/camelcase
export function convertPanelDataPre_6_3(
  panel: {
    gridData: GridData;
    version: string;
  },
  useMargins: boolean
) {
  ['w', 'x', 'h', 'y'].forEach(key => {
    if (!_.has(panel.gridData, key)) {
      throw new Error(
        i18n.translate('kbn.dashboard.panel.unableToMigratePanelDataForSixThreeZeroErrorMessage', {
          defaultMessage:
            'Unable to migrate panel data for "6.3.0" backwards compatibility, panel does not contain expected field: {key}',
          values: { key },
        })
      );
    }
  });

  // see https://github.com/elastic/kibana/issues/20635 on why the scale factor changes when margins are being used
  const heightScaleFactor = useMargins
    ? PANEL_HEIGHT_SCALE_FACTOR_WITH_MARGINS
    : PANEL_HEIGHT_SCALE_FACTOR;

  panel.gridData.w = panel.gridData.w * PANEL_WIDTH_SCALE_FACTOR;
  panel.gridData.x = panel.gridData.x * PANEL_WIDTH_SCALE_FACTOR;
  panel.gridData.h = panel.gridData.h * heightScaleFactor;
  panel.gridData.y = panel.gridData.y * heightScaleFactor;
  panel.version = chrome.getKibanaVersion();

  return panel;
}

export function parseVersion(version = '6.0.0'): SemanticVersion {
  const versionSplit = version.split('.');
  if (versionSplit.length < 3) {
    throw new Error(
      i18n.translate('kbn.dashboard.panel.invalidVersionErrorMessage', {
        defaultMessage: 'Invalid version, {version}, expected {semver}',
        values: {
          version,
          semver: '<major>.<minor>.<patch>',
        },
      })
    );
  }
  return {
    major: parseInt(versionSplit[0], 10),
    minor: parseInt(versionSplit[1], 10),
  };
}

// Look for the smallest y and x value where the default panel will fit.
function findTopLeftMostOpenSpace(
  width: number,
  height: number,
  currentPanels: SavedDashboardPanel[]
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
  return { x: 0, y: Infinity };
}

/**
 * Creates and initializes a basic panel state.
 * @param {number} id
 * @param {string} type
 * @param {number} panelIndex
 * @param {Array} currentPanels
 * @return {PanelState}
 */
export function createPanelState(
  id: string,
  type: string,
  panelIndex: string,
  currentPanels: SavedDashboardPanel[]
) {
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
      i: panelIndex.toString(),
    },
    version: chrome.getKibanaVersion(),
    panelIndex: panelIndex.toString(),
    type,
    id,
    embeddableConfig: {},
  };
}
