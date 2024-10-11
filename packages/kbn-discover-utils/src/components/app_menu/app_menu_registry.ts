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
  AppMenuItemPrimary,
  AppMenuItemSecondary,
  AppMenuItemCustom,
  AppMenuActionSecondary,
  AppMenuActionId,
  AppMenuActionType,
  AppMenuActionSubmenuCustom,
  AppMenuActionSubmenuSecondary,
  AppMenuActionBase,
  AppMenuActionSubmenuBase,
} from './types';

export class AppMenuRegistry {
  private readonly appMenuItems: AppMenuItem[];

  constructor(primaryAndSecondaryActions: Array<AppMenuItemPrimary | AppMenuItemSecondary>) {
    this.appMenuItems = assignOrderToActions(primaryAndSecondaryActions);
  }

  public registerCustomAction(appMenuItem: AppMenuItemCustom) {
    this.appMenuItems.push(appMenuItem);
  }

  public registerCustomActionUnderAlerts(appMenuItem: AppMenuActionSecondary) {
    const alertsMenuItem = this.appMenuItems.find((item) => item.id === AppMenuActionId.alerts);
    if (alertsMenuItem && isAppMenuActionSubmenuSecondary(alertsMenuItem)) {
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

function isAppMenuActionSubmenu(
  appMenuItem: AppMenuItem
): appMenuItem is AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom {
  return 'actions' in appMenuItem && Array.isArray(appMenuItem.actions);
}

function isAppMenuActionSubmenuSecondary(
  appMenuItem: AppMenuItem
): appMenuItem is AppMenuActionSubmenuSecondary {
  return isAppMenuActionSubmenu(appMenuItem) && appMenuItem.type === AppMenuActionType.secondary;
}

const FALLBACK_ORDER = Number.MAX_SAFE_INTEGER;

function sortByOrder<T extends AppMenuActionBase>(a: T, b: T): number {
  return (a.order ?? FALLBACK_ORDER) - (b.order ?? FALLBACK_ORDER);
}

function getAppMenuSubmenuWithSortedItemsByOrder<
  T extends AppMenuActionSubmenuBase = AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom
>(appMenuItem: T): T {
  return {
    ...appMenuItem,
    actions: [...appMenuItem.actions].sort(sortByOrder),
  };
}

function sortAppMenuItemsByOrder(appMenuItems: AppMenuItem[]): AppMenuItem[] {
  const sortedAppMenuItems = [...appMenuItems].sort(sortByOrder);
  return sortedAppMenuItems.map((appMenuItem) => {
    if (isAppMenuActionSubmenu(appMenuItem)) {
      return getAppMenuSubmenuWithSortedItemsByOrder(appMenuItem);
    }
    return appMenuItem;
  });
}

function getAppMenuSubmenuWithAssignedOrder<
  T extends AppMenuActionSubmenuBase = AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom
>(appMenuItem: T, order: number): T {
  let orderInSubmenu = 0;
  const actionsWithOrder = appMenuItem.actions.map((action) => {
    orderInSubmenu = orderInSubmenu + 100;
    return {
      ...action,
      order: action.order ?? orderInSubmenu,
    };
  });
  return {
    ...appMenuItem,
    order: appMenuItem.order ?? order,
    actions: actionsWithOrder,
  };
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
      return getAppMenuSubmenuWithAssignedOrder(appMenuItem, order);
    }
    return {
      ...appMenuItem,
      order: appMenuItem.order ?? order,
    };
  });
}
