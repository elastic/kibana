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
import { IEmbeddable } from '../embeddables';
import { ContextMenuAction } from './context_menu_action';
import { ContextMenuPanel } from './context_menu_panel';

/**
 * Loops through allActions and extracts those that belong on the given contextMenuPanelId
 * @param {string} contextMenuPanelId
 * @param {Array.<ContextMenuAction>} allActions
 */
function getActionsForPanel<E extends IEmbeddable>(
  contextMenuPanelId: string,
  allActions: Array<ContextMenuAction<E>>
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
function buildEuiContextMenuPanelItemsAndChildPanels<E extends IEmbeddable>({
  contextMenuPanelId,
  actions,
  embeddable,
}: {
  contextMenuPanelId: string;
  actions: Array<ContextMenuAction<E>>;
  embeddable: E;
}) {
  const items: EuiContextMenuPanelItemDescriptor[] = [];
  const childPanels: EuiContextMenuPanelDescriptor[] = [];
  const actionsForPanel = getActionsForPanel(contextMenuPanelId, actions);
  actionsForPanel.forEach(action => {
    const isVisible = action.isVisible({ embeddable });
    if (!isVisible) {
      return;
    }

    if (action.childContextMenuPanel) {
      childPanels.push(
        ...buildEuiContextMenuPanels({
          contextMenuPanel: action.childContextMenuPanel,
          actions,
          embeddable,
        })
      );
    }

    items.push(
      convertPanelActionToContextMenuItem({
        action,
        embeddable,
      })
    );
  });

  return { items, childPanels };
}

/**
 * Transforms a DashboardContextMenuPanel to the shape EuiContextMenuPanel expects, inserting any registered pluggable
 * panel actions.
 * @param contextMenuPanel
 * @param actions to build the context menu with
 * @param embeddable
 * @return An array of context menu panels to be used in the eui react component.
 */
export function buildEuiContextMenuPanels<E extends IEmbeddable = IEmbeddable>({
  contextMenuPanel,
  actions,
  embeddable,
}: {
  contextMenuPanel: ContextMenuPanel<E>;
  actions: Array<ContextMenuAction<E>>;
  embeddable: E;
}): EuiContextMenuPanelDescriptor[] {
  const euiContextMenuPanel: EuiContextMenuPanelDescriptor = {
    id: contextMenuPanel.id,
    title: contextMenuPanel.title,
    items: [],
    content: contextMenuPanel.getContent({ embeddable }),
  };
  const contextMenuPanels = [euiContextMenuPanel];

  const { items, childPanels } = buildEuiContextMenuPanelItemsAndChildPanels({
    contextMenuPanelId: contextMenuPanel.id,
    actions,
    embeddable,
  });

  euiContextMenuPanel.items = items;
  return contextMenuPanels.concat(childPanels);
}

/**
 *
 * @param {ContextMenuAction} action
 * @param {Embeddable} embeddable
 * @return {EuiContextMenuPanelItemDescriptor}
 */
function convertPanelActionToContextMenuItem<E extends IEmbeddable>({
  action,
  embeddable,
}: {
  action: ContextMenuAction<E>;
  embeddable: E;
}): EuiContextMenuPanelItemDescriptor {
  const menuPanelItem: EuiContextMenuPanelItemDescriptor = {
    name: action.displayName,
    icon: action.icon,
    panel: _.get(action, 'childContextMenuPanel.id'),
    disabled: action.isDisabled({ embeddable }),
    'data-test-subj': `embeddablePanelAction-${action.id}`,
  };

  if (action.onClick) {
    menuPanelItem.onClick = () => {
      if (action.onClick) {
        action.onClick({ embeddable });
      }
    };
  }

  if (action.getHref) {
    menuPanelItem.href = action.getHref({ embeddable });
  }

  return menuPanelItem;
}
