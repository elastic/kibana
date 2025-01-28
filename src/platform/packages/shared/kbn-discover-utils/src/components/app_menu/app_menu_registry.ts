/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AppMenuActionBase,
  AppMenuActionSubmenuBase,
  AppMenuActionSubmenuCustom,
  AppMenuSubmenuHorizontalRule,
  AppMenuActionSubmenuSecondary,
  AppMenuActionType,
  AppMenuItem,
  AppMenuItemCustom,
  AppMenuItemPrimary,
  AppMenuItemSecondary,
  AppMenuSubmenuActionCustom,
} from './types';

export class AppMenuRegistry {
  static CUSTOM_ITEMS_LIMIT = 2;

  private appMenuItems: AppMenuItem[];
  /**
   * As custom actions can be registered under a submenu from both root and data source profiles, we need to keep track of them separately.
   * Otherwise, it would be less predictable. For example, we would override/reset the actions from the data source profile with the ones from the root profile.
   * @private
   */
  private customSubmenuItemsBySubmenuId: Map<
    string,
    Array<AppMenuSubmenuActionCustom | AppMenuSubmenuHorizontalRule>
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

  /**
   * Register a custom action to the app menu. It can be a simple action or a submenu with more actions and horizontal rules.
   * Note: Only 2 top level custom actions are allowed to be rendered in the app menu. The rest will be ignored.
   * A custom action can also open a flyout or a modal. For that, return your custom react node from action's `onClick` event and call `onFinishAction` when you're done.
   * @param appMenuItem
   */
  public registerCustomAction(appMenuItem: AppMenuItemCustom) {
    this.appMenuItems = [
      ...this.appMenuItems.filter(
        // prevent duplicates
        (item) => !(item.id === appMenuItem.id && item.type === AppMenuActionType.custom)
      ),
      appMenuItem,
    ];
  }

  /**
   * Register a custom action under a submenu. It can be an action or a horizontal rule.
   * Any number of submenu actions can be registered and rendered.
   * You can also extend an existing submenu with more actions. For example, AppMenuActionType.alerts.
   * `order` property is optional and can be used to control the order of actions in the submenu.
   * @param submenuId
   * @param appMenuItem
   */
  public registerCustomActionUnderSubmenu(
    submenuId: string,
    appMenuItem: AppMenuSubmenuActionCustom | AppMenuSubmenuHorizontalRule
  ) {
    this.customSubmenuItemsBySubmenuId.set(submenuId, [
      ...(this.customSubmenuItemsBySubmenuId.get(submenuId) ?? []).filter(
        // prevent duplicates and allow overrides
        (item) => item.id !== appMenuItem.id
      ),
      appMenuItem,
    ]);
  }

  private getSortedItemsForType(type: AppMenuActionType) {
    let actions = this.appMenuItems.filter((item) => item.type === type);

    if (type === AppMenuActionType.custom && actions.length > AppMenuRegistry.CUSTOM_ITEMS_LIMIT) {
      // apply the limitation on how many custom items can be shown
      actions = actions.slice(0, AppMenuRegistry.CUSTOM_ITEMS_LIMIT);
    }

    // enrich submenus with custom actions
    if (type === AppMenuActionType.secondary || type === AppMenuActionType.custom) {
      [...this.customSubmenuItemsBySubmenuId.entries()].forEach(([submenuId, customActions]) => {
        actions = actions.map((item) => {
          if (item.id === submenuId && isAppMenuActionSubmenu(item)) {
            return extendSubmenuWithCustomActions(item, customActions);
          }
          return item;
        });
      });
    }

    return sortAppMenuItemsByOrder(actions);
  }

  /**
   * Get the resulting app menu items sorted by type and order.
   */
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

function extendSubmenuWithCustomActions<
  T extends AppMenuActionSubmenuBase = AppMenuActionSubmenuSecondary | AppMenuActionSubmenuCustom
>(
  appMenuItem: T,
  customActions: Array<AppMenuSubmenuActionCustom | AppMenuSubmenuHorizontalRule>
): T {
  const customActionsIds = new Set(customActions.map((action) => action.id));
  return {
    ...appMenuItem,
    actions: [
      ...appMenuItem.actions.filter((item) => !customActionsIds.has(item.id)), // allow to override secondary actions with custom ones
      ...customActions,
    ],
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
