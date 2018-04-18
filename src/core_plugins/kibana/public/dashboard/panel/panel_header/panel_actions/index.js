export { getEditPanelAction } from './get_edit_panel_action';
export { getRemovePanelAction } from './get_remove_panel_action';
export { buildKuiContextMenuPanels } from './build_context_menu';
export { getCustomizePanelAction } from './get_customize_panel_action';
export { getToggleExpandPanelAction } from './get_toggle_expand_panel_action';

// import { PanelActionsRegistryProvider } from 'ui/registry/panel_actions_registry';
// import { PanelAction } from './panel_action';
//
// PanelActionsRegistryProvider.register(new PanelAction({ name: 'Edit', parentPanelId: 'mainMenu' }));


/**
 * @typedef {Object} ContextMenuAction
 * @property {(embeddableState, containerState) => boolean} visible - a function that returns whether or not this
 * action should be visible based on the embeddable and container states given.
 *
 */

/**
 * @typedef {Object} ContextMenuPane
 * @property {string} title
 * @property {string} id
 * @property {Array.<PanelAction>|undefined} actions - an optional array of panel items. Either this property or content
 * should be defined.
 * @property {Element|undefined} content - either items or content should be given for a panel. Can use custom
 * content instead of an array of panel actions if so desired.
 */
