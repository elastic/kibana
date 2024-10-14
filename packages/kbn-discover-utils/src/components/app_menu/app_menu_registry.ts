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
  AppMenuActionType,
  AppMenuActionSubmenuCustom,
  AppMenuActionSubmenuSecondary,
  AppMenuActionBase,
  AppMenuActionSubmenuBase,
  AppMenuActionCustom,
  AppMenuActionSubmenuHorizontalRule,
} from './types';

export class AppMenuRegistry {
  private appMenuItems: AppMenuItem[];
  private customSubmenuItemsBySubmenuId: Map<
    string,
    Array<AppMenuActionCustom | AppMenuActionSubmenuHorizontalRule>
  >;

  constructor(primaryAndSecondaryActions: Array<AppMenuItemPrimary | AppMenuItemSecondary>) {
    this.appMenuItems = assignOrderToActions(primaryAndSecondaryActions);
    this.customSubmenuItemsBySubmenuId = new Map();
  }

  public isActionRegistered(appMenuItemId: string) {
    return (
      this.appMenuItems.some((item) => {
        if (item.id === appMenuItemId) {
          return true;
        }
        if (isAppMenuActionSubmenu(item)) {
          return item.actions.some((submenuItem) => submenuItem.id === appMenuItemId);
        }
        return false;
      }) ||
      [...this.customSubmenuItemsBySubmenuId.values()].some((submenuItems) =>
        submenuItems.some((item) => item.id === appMenuItemId)
      )
    );
  }

  public registerCustomAction(appMenuItem: AppMenuItemCustom) {
    this.appMenuItems = [
      ...this.appMenuItems.filter((item) => item.id !== appMenuItem.id),
      appMenuItem,
    ];
  }

  public registerCustomActionUnderSubmenu(submenuId: string, appMenuItem: AppMenuActionCustom) {
    this.customSubmenuItemsBySubmenuId.set(submenuId, [
      ...(this.customSubmenuItemsBySubmenuId.get(submenuId) ?? []).filter(
        (item) => item.id !== appMenuItem.id
      ),
      appMenuItem,
    ]);
  }

  private getSortedItemsForType(type: AppMenuActionType) {
    const actions = this.appMenuItems.filter((item) => item.type === type);

    // enrich submenus with custom actions
    if (type === AppMenuActionType.secondary || type === AppMenuActionType.custom) {
      [...this.customSubmenuItemsBySubmenuId.entries()].forEach(([submenuId, customActions]) => {
        const submenuParentItem = actions.find((item) => item.id === submenuId);
        if (submenuParentItem && isAppMenuActionSubmenu(submenuParentItem)) {
          submenuParentItem.actions.push(...customActions);
        }
      });
    }

    return sortAppMenuItemsByOrder(actions);
  }

  public getSortedItems() {
    const primaryItems = this.getSortedItemsForType(AppMenuActionType.primary);
    const secondaryItems = this.getSortedItemsForType(AppMenuActionType.secondary);
    const customItems = this.getSortedItemsForType(AppMenuActionType.custom);

    return [...customItems, ...secondaryItems, ...primaryItems];
  }
}

function isAppMenuActionSubmenu(
  appMenuItem: AppMenuItem
): appMenuItem is AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom {
  return 'actions' in appMenuItem && Array.isArray(appMenuItem.actions);
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
