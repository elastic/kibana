import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from '../dashboard_constants';
import chrome from 'ui/chrome';

export class PanelUtils {

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
