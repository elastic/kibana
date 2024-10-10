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
  AppMenuActionId,
  AppMenuPopoverActions,
  AppMenuActionType,
} from './types';

export class AppMenuRegistry {
  private readonly appMenuItems: AppMenuItem[];

  constructor(primaryAndSecondaryActions: AppMenuItem[]) {
    this.appMenuItems = assignOrderToActions(primaryAndSecondaryActions);
  }

  public registerCustomAction(appMenuItem: AppMenuAction) {
    this.appMenuItems.push(appMenuItem);
  }

  public registerCustomActionUnderAlerts(appMenuItem: AppMenuAction) {
    const alertsMenuItem = this.appMenuItems.find((item) => item.id === AppMenuActionId.alerts);
    if (alertsMenuItem && isAppMenuActionsPopover(alertsMenuItem)) {
      // insert the custom action before the last item in the alerts menu
      alertsMenuItem.actions.splice(alertsMenuItem.actions.length - 1, 0, appMenuItem);
    }
  }

  public getSortedItems() {
    const primaryActions = sortAppMenuItems(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.primary)
    );
    const secondaryActions = sortAppMenuItems(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.secondary)
    );
    const customActions = sortAppMenuItems(
      this.appMenuItems.filter((item) => item.type === AppMenuActionType.custom)
    );

    return [...customActions, ...secondaryActions, ...primaryActions];
  }
}

function isAppMenuActionsPopover(appMenuItem: AppMenuItem): appMenuItem is AppMenuPopoverActions {
  return 'actions' in appMenuItem;
}

function sortByOrder(a: AppMenuItem, b: AppMenuItem): number {
  return (a.order ?? 0) - (b.order ?? 0);
}

function sortAppMenuItems(appMenuItems: AppMenuItem[]): AppMenuItem[] {
  const sortedAppMenuItems = [...appMenuItems].sort(sortByOrder);
  return sortedAppMenuItems.map((appMenuItem) => {
    if (isAppMenuActionsPopover(appMenuItem)) {
      const popoverWithSortedActions: AppMenuPopoverActions = {
        ...appMenuItem,
        actions: [...appMenuItem.actions].sort(sortByOrder),
      };
      return popoverWithSortedActions;
    }
    return appMenuItem;
  });
}

function assignOrderToActions(appMenuItems: AppMenuItem[]): AppMenuItem[] {
  let order = 0;
  return appMenuItems.map((appMenuItem) => {
    order = order + 100;
    if (isAppMenuActionsPopover(appMenuItem)) {
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
