import { DEFAULT_PANEL_WIDTH, DEFAULT_PANEL_HEIGHT } from 'plugins/kibana/dashboard/components/panel/lib/panel_state';

export class PanelUtils {
  /**
   * Fills in default parameters where not specified.
   * @param {PanelState} panel
   */
  static initializeDefaults(panel) {
    panel.size_x = panel.size_x || DEFAULT_PANEL_WIDTH;
    panel.size_y = panel.size_y || DEFAULT_PANEL_HEIGHT;

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

  /**
   * Ensures that the panel object has the latest size/pos info.
   * @param {PanelState} panel
   */
  static refreshSizeAndPosition(panel) {
    const data = panel.$el.coords().grid;
    panel.size_x = data.size_x;
    panel.size_y = data.size_y;
    panel.col = data.col;
    panel.row = data.row;
  }

  /**
   * $el is a circular structure because it contains a reference to it's parent panel,
   * so it needs to be removed before it can be serialized (we also don't
   * want it to show up in the url).
   * @param {PanelState} panel
   */
  static makeSerializeable(panel) {
    delete panel.$el;
  }
}
