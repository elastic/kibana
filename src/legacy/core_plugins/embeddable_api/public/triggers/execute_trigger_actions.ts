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
import { Action, actionRegistry } from '../actions';
import { Container } from '../containers';
import { openContextMenu } from '../context_menu_actions';
import {
  buildEuiContextMenuPanels,
  ContextMenuAction,
  ContextMenuPanel,
} from '../context_menu_actions';
import { Embeddable } from '../embeddables';

export async function executeTriggerActions(
  triggerId: string,
  {
    embeddable,
    container,
    triggerContext,
  }: {
    embeddable: Embeddable;
    container?: Container;
    triggerContext: any;
  }
) {
  const actions = await actionRegistry.getActionsForTrigger(triggerId, { embeddable, container });
  if (actions.length > 1) {
    const contextMenuPanel = new ContextMenuPanel({
      title: 'Actions',
      id: 'mainMenu',
    });

    const closeMyContextMenuPanel = () => {
      session.close();
    };
    const contextMenuActions: ContextMenuAction[] = [];
    actions.forEach((action: Action) => {
      contextMenuActions.push(
        new ContextMenuAction(
          {
            id: action.id,
            displayName: action.getTitle({ embeddable, container }),
            parentPanelId: 'mainMenu',
          },
          {
            onClick: () => {
              action.execute({ embeddable, container, triggerContext });
              closeMyContextMenuPanel();
            },
          }
        )
      );
    });
    const panels = buildEuiContextMenuPanels({
      contextMenuPanel,
      actions: contextMenuActions,
      embeddable,
      container,
    });

    const session = openContextMenu(panels);
  } else if (actions.length === 1) {
    actions[0].execute({ embeddable, container, triggerContext });
  }
}
