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

import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import _ from 'lodash';
import { Container } from '../containers';
import { Embeddable } from '../embeddables';
import { ContextMenuAction } from './context_menu_action';
import { ContextMenuPanel } from './context_menu_panel';

/**
 * Loops through allActions and extracts those that belong on the given contextMenuPanelId
 * @param {string} contextMenuPanelId
 * @param {Array.<ContextMenuAction>} allActions
 */
function getActionsForPanel<E extends Embeddable<any, any>, C extends Container<any, any, any>>(
  contextMenuPanelId: string,
  allActions: Array<ContextMenuAction<E, C>>
) {
  return allActions.filter(action => action.parentPanelId === contextMenuPanelId);
}

/**
 * @param {String} contextMenuPanelId
 * @param {Array.<ContextMenuAction>} actions
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {{
 *   Array.<EuiContextMenuPanelItemDescriptor> items - panel actions converted into the items expected to be on an
 *     EuiContextMenuPanel,
 *   Array.<EuiContextMenuPanelDescriptor> childPanels - extracted child panels, if any actions also open a panel. They
 *     need to be moved to the top level for EUI.
 *  }}
 */
function buildEuiContextMenuPanelItemsAndChildPanels<
  E extends Embeddable<any, any>,
  C extends Container<any, any, any>
>({
  contextMenuPanelId,
  actions,
  embeddable,
  container,
}: {
  contextMenuPanelId: string;
  actions: Array<ContextMenuAction<E, C>>;
  embeddable: E;
  container?: C;
}) {
  const items: EuiContextMenuPanelItemDescriptor[] = [];
  const childPanels: EuiContextMenuPanelDescriptor[] = [];
  const actionsForPanel = getActionsForPanel(contextMenuPanelId, actions);
  actionsForPanel.forEach(action => {
    const isVisible = action.isVisible({ embeddable, container });
    if (!isVisible) {
      return;
    }

    if (action.childContextMenuPanel) {
      childPanels.push(
        ...buildEuiContextMenuPanels({
          contextMenuPanel: action.childContextMenuPanel,
          actions,
          embeddable,
          container,
        })
      );
    }

    items.push(
      convertPanelActionToContextMenuItem({
        action,
        container,
        embeddable,
      })
    );
  });

  return { items, childPanels };
}

/**
 * Transforms a DashboardContextMenuPanel to the shape EuiContextMenuPanel expects, inserting any registered pluggable
 * panel actions.
 * @param {ContextMenuPanel} contextMenuPanel
 * @param {Array.<ContextMenuAction>} actions to build the context menu with
 * @param {Embeddable} embeddable
 * @param {ContainerState} containerState
 * @return {EuiContextMenuPanelDescriptor[]} An array of context menu panels to be used in the eui react component.
 */
export function buildEuiContextMenuPanels<
  E extends Embeddable = Embeddable,
  C extends Container = Container
>({
  contextMenuPanel,
  actions,
  embeddable,
  container,
}: {
  contextMenuPanel: ContextMenuPanel<E, C>;
  actions: Array<ContextMenuAction<E, C>>;
  embeddable: E;
  container?: C;
}): EuiContextMenuPanelDescriptor[] {
  const euiContextMenuPanel: EuiContextMenuPanelDescriptor = {
    id: contextMenuPanel.id,
    title: contextMenuPanel.title,
    items: [],
    content: contextMenuPanel.getContent({ embeddable, container }),
  };
  const contextMenuPanels = [euiContextMenuPanel];

  const { items, childPanels } = buildEuiContextMenuPanelItemsAndChildPanels({
    contextMenuPanelId: contextMenuPanel.id,
    actions,
    embeddable,
    container,
  });

  euiContextMenuPanel.items = items;
  return contextMenuPanels.concat(childPanels);
}

/**
 *
 * @param {ContextMenuAction} action
 * @param {ContainerState} containerState
 * @param {Embeddable} embeddable
 * @return {EuiContextMenuPanelItemDescriptor}
 */
function convertPanelActionToContextMenuItem<
  E extends Embeddable<any, any>,
  C extends Container<any, any, any>
>({
  action,
  container,
  embeddable,
}: {
  action: ContextMenuAction<E, C>;
  container?: C;
  embeddable: E;
}): EuiContextMenuPanelItemDescriptor {
  const menuPanelItem: EuiContextMenuPanelItemDescriptor = {
    name: action.displayName,
    icon: action.icon,
    panel: _.get(action, 'childContextMenuPanel.id'),
    disabled: action.isDisabled({ embeddable, container }),
    'data-test-subj': `embeddablePanelAction-${action.id}`,
  };

  if (action.onClick) {
    menuPanelItem.onClick = () => {
      if (action.onClick) {
        action.onClick({ embeddable, container });
      }
    };
  }

  if (action.getHref) {
    menuPanelItem.href = action.getHref({ embeddable, container });
  }

  return menuPanelItem;
}
