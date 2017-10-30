/**
 * NOTE: The PanelState jsdoc is defined in ../panel/panel_state. Right now whatever is stored on this tree is
 * saved both to appstate and with the dashboard object. This coupling is subtle, fragile, and should be removed.
 * TODO: make a function to translate the redux panel state into an object to be used for storage and/or appstate.
 */

/**
 * @param panel {PanelState}
 * @return {string}
 */
export const getPanelType = panel => panel.type;
