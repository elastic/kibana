import { panelActionsStore } from '../../../store/panel_actions_store';

/**
 * Loops through any registered actions and inserts any that belong on the given panel.
 * @param {string} contextMenuPanelId
 * @param {Array.<DashboardPanelAction>} contextMenuActions
 */
function insertPluggableActionsForPanel(contextMenuPanelId, contextMenuActions) {
  for (let i = 0; i < panelActionsStore.actions.length; i++) {
    const pluggableAction = panelActionsStore.actions[i];
    if (pluggableAction.parentPanelId === contextMenuPanelId) {
      contextMenuActions.push(pluggableAction);
    }
  }
}

/**
 *
 * @param {Array.<DashboardPanelAction>} contextMenuActions
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {{
 *   Array.<EuiContextMenuPanelItemShape> items - panel actions converted into the items expected to be on an
 *     EuiContextMenuPanel,
 *   Array.<EuiContextMenuPanelShape> childPanels - extracted child panels, if any actions also open a panel. They
 *     need to be moved to the top level for EUI.
 *  }}
 */
function buildEuiContextMenuPanelItemsAndChildPanels(contextMenuActions, { embeddable, containerState }) {
  const items = [];
  let childPanels = [];
  contextMenuActions.forEach(action => {
    const isVisible = action.isVisible({ embeddable, containerState });
    if (!isVisible) {
      return;
    }

    let childPanelToOpenOnClick;
    if (action.childContextMenuPanel) {
      childPanels = childPanels.concat(
        buildEuiContextMenuPanels(action.childContextMenuPanel, { embeddable, containerState }));
      childPanelToOpenOnClick = action.childContextMenuPanel.id;
    }

    items.push(convertPanelActionToContextMenuItem(
      {
        action,
        contextMenuPanelId: childPanelToOpenOnClick,
        containerState,
        embeddable
      }));
  });

  return { items, childPanels };
}

/**
 * Transforms a DashboardContextMenuPanel to the shape EuiContextMenuPanel expects, inserting any registered pluggable
 * panel actions.
 * @param {DashboardContextMenuPanel} contextMenuPanel
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {Object} An object that conforms to EuiContextMenuPanelShape in elastic/eui
 */
export function buildEuiContextMenuPanels(
  contextMenuPanel,
  {
    embeddable,
    containerState
  }) {
  const euiContextMenuPanel = {
    id: contextMenuPanel.id,
    title: contextMenuPanel.title,
    items: [],
    content: contextMenuPanel.getContent({ embeddable, containerState }),
  };
  let contextMenuPanels = [euiContextMenuPanel];
  const contextMenuActions = contextMenuPanel.actions || [];

  insertPluggableActionsForPanel(contextMenuPanel.id, contextMenuActions);

  const { items, childPanels } =
    buildEuiContextMenuPanelItemsAndChildPanels(contextMenuActions, { embeddable, containerState });

  contextMenuPanels = contextMenuPanels.concat(childPanels);
  euiContextMenuPanel.items = items;
  return contextMenuPanels;
}

/**
 *
 * @param {DashboardPanelAction} action
 * @param {String|undefined} contextMenuPanelId - an optional nested panel id to show when clicked.
 * @param {ContainerState} containerState
 * @param {Embeddable} embeddable
 * @return {Object} See EuiContextMenuPanelItemShape in @elastic/eui
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

