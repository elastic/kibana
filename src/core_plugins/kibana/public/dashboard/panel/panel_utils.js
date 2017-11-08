import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../dashboard_constants';
import chrome from 'ui/chrome';

import _ from 'lodash';

export class PanelUtils {
  /**
   * Fills in default parameters where not specified.
   * @param {PanelState} panel
   */
  static initializeDefaults(panel) {
    panel.gridData = panel.gridData || {};
    panel.gridData.w = panel.gridData.w || DEFAULT_PANEL_WIDTH;
    panel.gridData.h = panel.gridData.h || DEFAULT_PANEL_HEIGHT;

    if (!panel.id) {
      // In the interest of backwards comparability
      if (panel.visId) {
        panel.id = panel.visId;
        panel.type = 'visualization';
        delete panel.visId;
      } else {
        throw new Error('Missing object id on panel');
      }
    }
  }

  static convertOldPanelData(panel) {
    panel.gridData = {
      x: panel.col - 1,
      y: panel.row - 1,
      w: panel.size_x || DEFAULT_PANEL_WIDTH,
      h: panel.size_y || DEFAULT_PANEL_HEIGHT,
      i: panel.panelIndex.toString()
    };
    panel.version = chrome.getKibanaVersion();
    panel.panelIndex = panel.panelIndex.toString();
    delete panel.size_x;
    delete panel.size_y;
    delete panel.row;
    delete panel.col;

    return panel;
  }

  /**
   * Returns the panel with the given panelIndex from the panels array (*NOT* the panel at the given index).
   * @param panelIndex {number} - Note this is *NOT* the index of the panel in the panels array.
   * panelIndex is really a panelId, but is called panelIndex for BWC reasons.
   * @param panels {Array<Object>}
   */
  static findPanelByPanelIndex(panelIndex, panels) {
    return _.find(panels, (panel) => panel.panelIndex === panelIndex);
  }

  static initPanelIndexes(panels) {
    // find the largest panelIndex in all the panels
    let maxIndex = this.getMaxPanelIndex(panels);

    // ensure that all panels have a panelIndex
    panels.forEach(function (panel) {
      if (!panel.panelIndex) {
        panel.panelIndex = maxIndex++;
      }
    });
  }

  static getMaxPanelIndex(panels) {
    let maxId = panels.reduce(function (id, panel) {
      return Math.max(id, panel.panelIndex || id);
    }, 0);
    return ++maxId;
  }
}
