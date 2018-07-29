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

import {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import _ from 'lodash';

import {
  DashboardContextMenuPanel,
  DashboardPanelAction,
} from 'ui/dashboard_panel_actions';
import { ContainerState, Embeddable } from 'ui/embeddable';
import { PanelId } from '../../../types';

// TODO: these should come from eui.
export interface EuiContextMenuPanelShape {
  id: string | number;
  content?: Element | JSX.Element;
  items: EuiContextMenuPanelItemShape[];
  title: string;
}

export interface EuiContextMenuPanelItemShape {
  id: string | number;
  name: string;
  icon?: Element | JSX.Element;
  onClick: () => void;
  panel: string | number;
  disabled: boolean;
  'data-test-subj'?: string;
}

/**
 * Loops through allActions and extracts those that belong on the given contextMenuPanelId
 * @param {string} contextMenuPanelId
 * @param {Array.<DashboardPanelAction>} allActions
 */
function getActionsForPanel(
  contextMenuPanelId: PanelId,
  allActions: DashboardPanelAction[]
): DashboardPanelAction[] {
  return allActions.filter(
    action => action.parentPanelId === contextMenuPanelId
  );
}

function buildEuiContextMenuPanelItemsAndChildPanels(
  contextMenuPanelId: PanelId,
  actions: DashboardPanelAction[],
  embeddable: Embeddable,
  containerState: ContainerState
): {
  items: EuiContextMenuPanelItemShape[];
  childPanels: EuiContextMenuPanelShape[];
} {
  const items: EuiContextMenuPanelItemShape[] = [];
  const childPanels: EuiContextMenuPanelShape[] = [];
  const actionsForPanel = getActionsForPanel(contextMenuPanelId, actions);
  actionsForPanel.forEach(action => {
    const isVisible = action.isVisible({ embeddable, containerState });
    if (!isVisible) {
      return;
    }

    if (action.childContextMenuPanel) {
      childPanels.push(
        ...buildEuiContextMenuPanels(
          action.childContextMenuPanel,
          actions,
          embeddable,
          containerState
        )
      );
    }

    items.push(
      convertPanelActionToContextMenuItem(action, containerState, embeddable)
    );
  });

  return { items, childPanels };
}

/**
 * Transforms a DashboardContextMenuPanel to the shape EuiContextMenuPanel expects, inserting any registered pluggable
 * panel actions.
 */
export function buildEuiContextMenuPanels(
  contextMenuPanel: DashboardContextMenuPanel,
  actions: DashboardPanelAction[],
  embeddable: Embeddable,
  containerState: ContainerState
): EuiContextMenuPanelDescriptor[] {
  const { items, childPanels } = buildEuiContextMenuPanelItemsAndChildPanels(
    contextMenuPanel.id,
    actions,
    embeddable,
    containerState
  );

  return childPanels.concat({
    content: contextMenuPanel.getContent({ embeddable, containerState }),
    id: contextMenuPanel.id,
    items,
    title: contextMenuPanel.title,
  });
}

/**
 *
 * @param {DashboardPanelAction} action
 * @param {ContainerState} containerState
 * @param {Embeddable} embeddable
 * @return {Object} See EuiContextMenuPanelItemShape in @elastic/eui
 */
function convertPanelActionToContextMenuItem(
  action: DashboardPanelAction,
  containerState: ContainerState,
  embeddable: Embeddable
): EuiContextMenuPanelItemDescriptor {
  return {
    'data-test-subj': `dashboardPanelAction-${action.id}`,
    disabled: action.isDisabled({ embeddable, containerState }),
    icon: action.icon,
    id: action.id || action.displayName.replace(/\s/g, ''),
    name: action.displayName,
    onClick: () => action.onClick({ embeddable, containerState }),
    panel: _.get(action, 'childContextMenuPanel.id'),
  };
}
