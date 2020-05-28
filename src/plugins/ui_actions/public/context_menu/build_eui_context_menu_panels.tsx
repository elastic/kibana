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

import * as React from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiToReactComponent } from '../../../kibana_react/public';
import { Action } from '../actions';

export const defaultTitle = i18n.translate('uiActions.actionPanel.title', {
  defaultMessage: 'Options',
});

/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export async function buildContextMenuForActions<Context extends object>({
  actions,
  actionContext,
  title = defaultTitle,
  closeMenu,
}: {
  actions: Array<Action<Context>>;
  actionContext: Context;
  title?: string;
  closeMenu: () => void;
}): Promise<EuiContextMenuPanelDescriptor> {
  const menuItems = await buildEuiContextMenuPanelItems<Context>({
    actions,
    actionContext,
    closeMenu,
  });

  return {
    id: 'mainMenu',
    title,
    items: menuItems,
  };
}

/**
 * Transform an array of Actions into the shape needed to build an EUIContextMenu
 */
async function buildEuiContextMenuPanelItems<Context extends object>({
  actions,
  actionContext,
  closeMenu,
}: {
  actions: Array<Action<Context>>;
  actionContext: Context;
  closeMenu: () => void;
}) {
  const items: EuiContextMenuPanelItemDescriptor[] = new Array(actions.length);
  const promises = actions.map(async (action, index) => {
    const isCompatible = await action.isCompatible(actionContext);
    if (!isCompatible) {
      return;
    }

    items[index] = await convertPanelActionToContextMenuItem({
      action,
      actionContext,
      closeMenu,
    });
  });

  await Promise.all(promises);

  return items.filter(Boolean);
}

async function convertPanelActionToContextMenuItem<Context extends object>({
  action,
  actionContext,
  closeMenu,
}: {
  action: Action<Context>;
  actionContext: Context;
  closeMenu: () => void;
}): Promise<EuiContextMenuPanelItemDescriptor> {
  const menuPanelItem: EuiContextMenuPanelItemDescriptor = {
    name: action.MenuItem
      ? React.createElement(uiToReactComponent(action.MenuItem), {
          context: actionContext,
        })
      : action.getDisplayName(actionContext),
    icon: action.getIconType(actionContext),
    panel: _.get(action, 'childContextMenuPanel.id'),
    'data-test-subj': `embeddablePanelAction-${action.id}`,
  };

  menuPanelItem.onClick = (event) => {
    if (event.currentTarget instanceof HTMLAnchorElement) {
      // from react-router's <Link/>
      if (
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // ignore everything but left clicks
        (!event.currentTarget.target || event.currentTarget.target === '_self') && // let browser handle "target=_blank" etc.
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
      ) {
        event.preventDefault();
        action.execute(actionContext);
      } else {
        // let browser handle navigation
      }
    } else {
      // not a link
      action.execute(actionContext);
    }

    closeMenu();
  };

  if (action.getHref) {
    const href = await action.getHref(actionContext);
    if (href) {
      menuPanelItem.href = href;
    }
  }

  return menuPanelItem;
}
