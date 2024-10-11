/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AppMenuItem,
  AppMenuAction,
  AppMenuActionSubmenu,
  AppMenuActionId,
  AppMenuActionType,
} from './types';

export class AppMenuRegistry {
  private readonly appMenuItems: AppMenuItem[];

  constructor(primaryAndSecondaryActions: AppMenuItem[]) {
    this.appMenuItems = assignOrderToActions(primaryAndSecondaryActions);
  }

  public registerCustomAction(appMenuItem: AppMenuAction | AppMenuActionSubmenu) {
    this.appMenuItems.push(appMenuItem);
  }

  public registerCustomActionUnderAlerts(appMenuItem: AppMenuAction) {
    const alertsMenuItem = this.appMenuItems.find((item) => item.id === AppMenuActionId.alerts);
    if (alertsMenuItem && isAppMenuActionSubmenu(alertsMenuItem)) {
      alertsMenuItem.actions.push(appMenuItem);
    }
  }

  public getSortedItems() {
    const primaryActions = sortAppMenuItemsByOrder(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.primary)
    );
    const secondaryActions = sortAppMenuItemsByOrder(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.secondary)
    );
    const customActions = sortAppMenuItemsByOrder(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.custom)
    );

    return [...customActions, ...secondaryActions, ...primaryActions];
  }
}

function isAppMenuActionSubmenu(appMenuItem: AppMenuItem): appMenuItem is AppMenuActionSubmenu {
  return 'actions' in appMenuItem;
}

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;

function sortByOrder(a: AppMenuItem, b: AppMenuItem): number {
  return (a.order ?? FALLBACK_ORDER) - (b.order ?? FALLBACK_ORDER);
}

function sortAppMenuItemsByOrder(appMenuItems: AppMenuItem[]): AppMenuItem[] {
  const sortedAppMenuItems = [...appMenuItems].sort(sortByOrder);
  return sortedAppMenuItems.map((appMenuItem) => {
    if (isAppMenuActionSubmenu(appMenuItem)) {
      const popoverWithSortedActions: AppMenuActionSubmenu = {
        ...appMenuItem,
        actions: [...appMenuItem.actions].sort(sortByOrder),
      };
      return popoverWithSortedActions;
    }
    return appMenuItem;
  });
}

/**
 * All primary and secondary actions by default get order 100, 200, 300,... assigned to them.
 * Same for actions under a submenu.
 * @param appMenuItems
 */
function assignOrderToActions(appMenuItems: AppMenuItem[]): AppMenuItem[] {
  let order = 0;
  return appMenuItems.map((appMenuItem) => {
    order = order + 100;
    if (isAppMenuActionSubmenu(appMenuItem)) {
      let orderInPopover = 0;
      const actionsWithOrder = appMenuItem.actions.map((action) => {
        orderInPopover = orderInPopover + 100;
        return {
          ...action,
          order: action.order ?? orderInPopover,
        };
      });
      return {
        ...appMenuItem,
        order: appMenuItem.order ?? order,
        actions: actionsWithOrder,
      };
    }
    return {
      ...appMenuItem,
      order: appMenuItem.order ?? order,
    };
  });
}
