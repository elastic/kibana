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
import sortBy from 'lodash/sortBy';
import { i18n } from '@kbn/i18n';
import { uiToReactComponent } from '../../../kibana_react/public';
import { Action } from '../actions';
import { Trigger } from '../triggers';
import { BaseContext } from '../types';

export const defaultTitle = i18n.translate('uiActions.actionPanel.title', {
  defaultMessage: 'Options',
});

interface ActionWithContext<Context extends BaseContext = BaseContext> {
  action: Action<Context>;
  context: Context;

  /**
   * Trigger that caused this action
   */
  trigger: Trigger;
}

/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export async function buildContextMenuForActions({
  actions,
  title = defaultTitle,
  closeMenu = () => {},
}: {
  actions: ActionWithContext[];
  title?: string;
  closeMenu?: () => void;
}): Promise<EuiContextMenuPanelDescriptor> {
  const menuItems = await buildEuiContextMenuPanelItems({
    actions,
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
async function buildEuiContextMenuPanelItems({
  actions,
  closeMenu,
}: {
  actions: ActionWithContext[];
  closeMenu: () => void;
}) {
  actions = sortBy(
    actions,
    (a) => -1 * (a.action.order ?? 0),
    (a) => a.action.type,
    (a) => a.action.getDisplayName({ ...a.context, trigger: a.trigger })
  );

  const items: EuiContextMenuPanelItemDescriptor[] = new Array(actions.length);
  const promises = actions.map(async ({ action, context, trigger }, index) => {
    const isCompatible = await action.isCompatible({
      ...context,
      trigger,
    });
    if (!isCompatible) {
      return;
    }

    items[index] = await convertPanelActionToContextMenuItem({
      action,
      actionContext: context,
      trigger,
      closeMenu,
    });
  });

  await Promise.all(promises);

  return items.filter(Boolean);
}

async function convertPanelActionToContextMenuItem<Context extends object>({
  action,
  actionContext,
  trigger,
  closeMenu,
}: {
  action: Action<Context>;
  actionContext: Context;
  trigger: Trigger;
  closeMenu: () => void;
}): Promise<EuiContextMenuPanelItemDescriptor> {
  const menuPanelItem: EuiContextMenuPanelItemDescriptor = {
    name: action.MenuItem
      ? React.createElement(uiToReactComponent(action.MenuItem), {
          context: {
            ...actionContext,
            trigger,
          },
        })
      : action.getDisplayName({
          ...actionContext,
          trigger,
        }),
    icon: action.getIconType({
      ...actionContext,
      trigger,
    }),
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
        action.execute({
          ...actionContext,
          trigger,
        });
      } else {
        // let browser handle navigation
      }
    } else {
      // not a link
      action.execute({
        ...actionContext,
        trigger,
      });
    }

    closeMenu();
  };

  if (action.getHref) {
    const href = await action.getHref({
      ...actionContext,
      trigger,
    });
    if (href) {
      menuPanelItem.href = href;
    }
  }

  return menuPanelItem;
}
