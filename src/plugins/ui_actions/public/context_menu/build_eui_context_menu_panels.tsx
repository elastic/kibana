/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiContextMenuPanelDescriptor, EuiContextMenuPanelItemDescriptor } from '@elastic/eui';
import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { uiToReactComponent } from '@kbn/kibana-react-plugin/public';
import { Action, ActionExecutionContext } from '../actions';
import { Trigger } from '../triggers';

export const defaultTitle = i18n.translate('uiActions.actionPanel.title', {
  defaultMessage: 'Options',
});

export const txtMore = i18n.translate('uiActions.actionPanel.more', {
  defaultMessage: 'More',
});

interface ActionWithContext<Context extends object = object> {
  action: Action<Context>;
  context: Context;

  /**
   * Trigger that caused this action
   */
  trigger: Trigger;
}

type ItemDescriptor = EuiContextMenuPanelItemDescriptor & {
  _order: number;
  _title?: string;
};

type PanelDescriptor = EuiContextMenuPanelDescriptor & {
  _level?: number;
  _icon?: string;
  items: ItemDescriptor[];
};

const onClick =
  (action: Action, context: ActionExecutionContext<object>, close: () => void) =>
  (event: React.MouseEvent) => {
    if (event.currentTarget instanceof HTMLAnchorElement) {
      // from react-router's <Link/>
      if (
        !event.defaultPrevented && // onClick prevented default
        event.button === 0 && // ignore everything but left clicks
        (!event.currentTarget.target || event.currentTarget.target === '_self') && // let browser handle "target=_blank" etc.
        !(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) // ignore clicks with modifier keys
      ) {
        event.preventDefault();
        action.execute(context);
      }
    } else action.execute(context);
    close();
  };

/**
 * This method adds "More" item to panels, which have more than 4 items; and
 * moves all items after the thrird one into that "More" sub-menu.
 */
const wrapMainPanelItemsIntoSubmenu = (panels: Record<string, PanelDescriptor>, id: string) => {
  const panel = panels[id];
  if (!panel) return;
  const maxItemsBeforeWrapping = 4;
  if (!panel.items) return;
  if (panel.items.length <= maxItemsBeforeWrapping) return;
  const visibleItems = panel.items.slice(0, 3) as ItemDescriptor[];
  const itemsInSubmenu = panel.items.slice(3) as ItemDescriptor[];
  const morePanelId = panel.id + '__more';
  const more: ItemDescriptor = {
    name: txtMore,
    panel: morePanelId,
    icon: 'boxesHorizontal',
    'data-test-subj': `embeddablePanelMore-${id}`,
    _order: -1,
  };
  panel.items = [...visibleItems, more];
  const subPanel: PanelDescriptor = {
    id: morePanelId,
    title: panel.title || defaultTitle,
    items: itemsInSubmenu,
  };
  panels[morePanelId] = subPanel;
};

const removeItemMetaFields = (items: ItemDescriptor[]): EuiContextMenuPanelItemDescriptor[] => {
  const euiItems: EuiContextMenuPanelItemDescriptor[] = [];
  for (const item of items) {
    const { _order: omit, _title: omit2, ...rest } = item;
    euiItems.push(rest);
  }
  return euiItems;
};

const removePanelMetaFields = (panels: PanelDescriptor[]): EuiContextMenuPanelDescriptor[] => {
  const euiPanels: EuiContextMenuPanelDescriptor[] = [];
  for (const panel of panels) {
    const { _level: omit, _icon: omit2, ...rest } = panel;
    euiPanels.push({ ...rest, items: removeItemMetaFields(rest.items) });
  }
  return euiPanels;
};

export interface BuildContextMenuParams {
  actions: ActionWithContext[];
  title?: string;
  closeMenu?: () => void;
}

/**
 * Transforms an array of Actions to the shape EuiContextMenuPanel expects.
 */
export async function buildContextMenuForActions({
  actions,
  title = defaultTitle,
  closeMenu = () => {},
}: BuildContextMenuParams): Promise<EuiContextMenuPanelDescriptor[]> {
  const panels: Record<string, PanelDescriptor> = {
    mainMenu: {
      id: 'mainMenu',
      title,
      items: [],
    },
  };
  const promises = actions.map(async (item) => {
    const { action } = item;
    const context: ActionExecutionContext<object> = { ...item.context, trigger: item.trigger };
    const isCompatible = await item.action.isCompatible(context);
    if (!isCompatible) return;
    let parentPanel = '';
    let currentPanel = '';
    if (action.grouping) {
      for (let i = 0; i < action.grouping.length; i++) {
        const group = action.grouping[i];
        currentPanel = group.id;
        if (!panels[currentPanel]) {
          const name = group.getDisplayName ? group.getDisplayName(context) : group.id;
          panels[currentPanel] = {
            id: currentPanel,
            title: name,
            items: [],
            _level: i,
            _icon: group.getIconType ? group.getIconType(context) : 'empty',
          };
          if (parentPanel) {
            panels[parentPanel].items!.push({
              name,
              panel: currentPanel,
              icon: group.getIconType ? group.getIconType(context) : 'empty',
              _order: group.order || 0,
              _title: group.getDisplayName ? group.getDisplayName(context) : '',
            });
          }
        }
        parentPanel = currentPanel;
      }
    }
    panels[parentPanel || 'mainMenu'].items!.push({
      name: action.MenuItem
        ? React.createElement(uiToReactComponent(action.MenuItem), { context })
        : action.getDisplayName(context),
      icon: action.getIconType(context),
      'data-test-subj': `embeddablePanelAction-${action.id}`,
      onClick: onClick(action, context, closeMenu),
      href: action.getHref ? await action.getHref(context) : undefined,
      _order: action.order || 0,
      _title: action.getDisplayName(context),
    });
  });
  await Promise.all(promises);

  for (const panel of Object.values(panels)) {
    const items = panel.items.filter(Boolean) as ItemDescriptor[];
    panel.items = _.sortBy(
      items,
      (a) => -1 * (a._order ?? 0),
      (a) => a._title
    );
  }

  wrapMainPanelItemsIntoSubmenu(panels, 'mainMenu');

  for (const panel of Object.values(panels)) {
    if (panel._level === 0) {
      if (panels.mainMenu.items.length > 0) {
        panels.mainMenu.items.push({
          isSeparator: true,
          key: panel.id + '__separator',
        });
      }
      if (panel.items.length > 3) {
        panels.mainMenu.items.push({
          name: panel.title || panel.id,
          icon: panel._icon || 'empty',
          panel: panel.id,
        });
      } else {
        panels.mainMenu.items.push(...panel.items);
      }
    }
  }

  const panelList = Object.values(panels);
  return removePanelMetaFields(panelList);
}
