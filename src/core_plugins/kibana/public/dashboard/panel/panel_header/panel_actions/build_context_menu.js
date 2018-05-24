import _ from 'lodash';

/**
 * Loops through allActions and extracts those that belong on the given contextMenuPanelId
 * @param {string} contextMenuPanelId
 * @param {Array.<DashboardPanelAction>} allActions
 */
function getActionsForPanel(contextMenuPanelId, allActions) {
  return allActions.filter(action => action.parentPanelId === contextMenuPanelId);
}

/**
 * @param {String} contextMenuPanelId
 * @param {Array.<DashboardPanelAction>} actions
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {{
 *   Array.<EuiContextMenuPanelItemShape> items - panel actions converted into the items expected to be on an
 *     EuiContextMenuPanel,
 *   Array.<EuiContextMenuPanelShape> childPanels - extracted child panels, if any actions also open a panel. They
 *     need to be moved to the top level for EUI.
 *  }}
 */
function buildEuiContextMenuPanelItemsAndChildPanels({ contextMenuPanelId, actions, embeddable, containerState }) {
  const items = [];
  const childPanels = [];
  const actionsForPanel = getActionsForPanel(contextMenuPanelId, actions);
  actionsForPanel.forEach(action => {
    const isVisible = action.isVisible({ embeddable, containerState });
    if (!isVisible) {
      return;
    }

    if (action.childContextMenuPanel) {
      childPanels.push(
        ...buildEuiContextMenuPanels({
          contextMenuPanel: action.childContextMenuPanel,
          actions,
          embeddable,
          containerState
        }));
    }

    items.push(convertPanelActionToContextMenuItem(
      {
        action,
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
 * @param {Array.<DashboardPanelAction>} actions to build the context menu with
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {Object} An object that conforms to EuiContextMenuPanelShape in elastic/eui
 */
export function buildEuiContextMenuPanels(
  {
    contextMenuPanel,
    actions,
    embeddable,
    containerState
  }) {
  const euiContextMenuPanel = {
    id: contextMenuPanel.id,
    title: contextMenuPanel.title,
    items: [],
    content: contextMenuPanel.getContent({ embeddable, containerState }),
  };
  const contextMenuPanels = [euiContextMenuPanel];

  const { items, childPanels } =
    buildEuiContextMenuPanelItemsAndChildPanels({
      contextMenuPanelId: contextMenuPanel.id,
      actions,
      embeddable,
      containerState
    });

  euiContextMenuPanel.items = items;
  return contextMenuPanels.concat(childPanels);
}

/**
 *
 * @param {DashboardPanelAction} action
 * @param {ContainerState} containerState
 * @param {Embeddable} embeddable
 * @return {Object} See EuiContextMenuPanelItemShape in @elastic/eui
 */
function convertPanelActionToContextMenuItem({ action, containerState, embeddable }) {
  return {
    id: action.id || action.displayName.replace(/\s/g, ''),
    name: action.displayName,
    icon: action.icon,
    panel: _.get(action, 'childContextMenuPanel.id'),
    onClick: () => action.onClick({ containerState, embeddable }),
    disabled: action.isDisabled({ containerState, embeddable }),
    'data-test-subj': `dashboardPanelAction-${action.id}`,
  };
}

