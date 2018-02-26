import { DASHBOARD_GRID_COLUMN_COUNT, DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../dashboard_constants';
import chrome from 'ui/chrome';

/**
 * Represents a panel on a grid. Keeps track of position in the grid and what visualization it
 * contains.
 *
 * @typedef {Object} PanelState
 * @property {number} id - Id of the visualization contained in the panel.
 * @property {string} version - Version of Kibana this panel was created in.
 * @property {string} type - Type of the visualization in the panel.
 * @property {number} panelIndex - Unique id to represent this panel in the grid. Note that this is
 * NOT the index in the panels array. While it may initially represent that, it is not
 * updated with changes in a dashboard, and is simply used as a unique identifier.  The name
 * remains as panelIndex for backward compatibility reasons - changing it can break reporting.
 * @property {Object} gridData
 * @property {number} gridData.w - Width of the panel.
 * @property {number} gridData.h - Height of the panel.
 * @property {number} gridData.x - Column position of the panel.
 * @property {number} gridData.y - Row position of the panel.
 */

// Look for the smallest y and x value where the default panel will fit.
function findTopLeftMostOpenSpace(width, height, currentPanels) {
  let maxY = -1;

  for (let i = 0; i < currentPanels.length; i++) {
    const panel = currentPanels[i];
    maxY = Math.max(panel.gridData.y + panel.gridData.h, maxY);
  }

  // Handle case of empty grid.
  if (maxY < 0) {
    return { x: 0, y: 0 };
  }

  const grid = new Array(maxY);
  for (let y = 0; y < maxY; y++) {
    grid[y] = new Array(DASHBOARD_GRID_COLUMN_COUNT).fill(0);
  }

  for (let i = 0; i < currentPanels.length; i++) {
    const panel = currentPanels[i];
    for (let x = panel.gridData.x; x < panel.gridData.x + panel.gridData.w; x++) {
      for (let y = panel.gridData.y; y < panel.gridData.y + panel.gridData.h; y++) {
        grid[y][x] = 1;
      }
    }
  }

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
export function createPanelState(id, type, panelIndex, currentPanels) {
  const { x, y } = findTopLeftMostOpenSpace(DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT, currentPanels);
  return {
    gridData: {
      w: DEFAULT_PANEL_WIDTH,
      h: DEFAULT_PANEL_HEIGHT,
      x,
      y,
      i: panelIndex.toString()
    },
    version: chrome.getKibanaVersion(),
    panelIndex: panelIndex.toString(),
    type: type,
    id: id,
    embeddableConfig: {},
  };
}

