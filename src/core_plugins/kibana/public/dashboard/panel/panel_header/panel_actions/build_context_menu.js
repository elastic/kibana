import { panelActionsCache } from '../../../cache/panel_actions_cache';

/**
 *
 * @param {ContextMenuPanel} contextMenuPanel
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {*[]}
 */
export function buildKuiContextMenuPanels(
  contextMenuPanel,
  {
    embeddable,
    containerState
  }) {
  const kuiContextMenuPanel = {
    id: contextMenuPanel.id,
    title: contextMenuPanel.title,
    items: [],
    content: contextMenuPanel.getContent({ embeddable, containerState }),
  };
  let contextMenuPanels = [kuiContextMenuPanel];
  const contextMenuActions = contextMenuPanel.actions || [];

  for (let i = 0; i < panelActionsCache.actions.length; i++) {
    const pluggableAction = panelActionsCache.actions[i];
    if (pluggableAction.parentPanelId === contextMenuPanel.id) {
      contextMenuActions.push(pluggableAction);
    }
  }

  contextMenuActions.forEach(action => {
    const isVisible = action.isVisible({ embeddable, containerState });
    if (!isVisible) {
      return;
    }

    let childPanelToOpenOnClick;
    if (action.childContextMenuPanel) {
      contextMenuPanels = contextMenuPanels.concat(
        buildKuiContextMenuPanels(action.childContextMenuPanel, { embeddable, containerState }));
      childPanelToOpenOnClick = action.childContextMenuPanel.id;
    }

    kuiContextMenuPanel.items.push(convertPanelActionToContextMenuItem(
      {
        action,
        contextMenuPanelId: childPanelToOpenOnClick,
        containerState,
        embeddable
      }));
  });
  return contextMenuPanels;
}

/**
 *
 * @param {DashboardPanelAction} action
 * @param {String|undefined} contextMenuPanelId - an optional nested panel id to show when clicked.
 * @param {ContainerState} containerState
 * @param {Embeddable} embeddable
 * @return {String} contextMenuItem.name
 * @return {Node} contextMenuItem.icon
 * @return {Function} contextMenuItem.onClick
 * @return {String|number|undefined} contextMenuItem.panel
 * @return {disabled} contextMenuItem.disabled
 */
function convertPanelActionToContextMenuItem({ action, contextMenuPanelId, containerState, embeddable }) {
  return {
    id: action.id || action.displayName.replace(/\s/g, ''),
    name: action.displayName,
    icon: action.icon,
    panel: contextMenuPanelId,
    onClick: () => action.onClick({ containerState, embeddable }),
    disabled: action.isDisabled({ containerState, embeddable }),
    'data-test-subj': `dashboardPanelAction-${action.id}`,
  };
}

