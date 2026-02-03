/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { AppMenuComponent } from './src';
export { AppMenuItem } from './src';
export { AppMenuActionButton } from './src';
export { AppMenuOverflowButton } from './src';
export { AppMenuPopover } from './src';
export { AppMenuPopoverActionButtons } from './src';

export type {
  AppMenuRunAction,
  AppMenuRunActionParams,
  AppMenuConfig,
  AppMenuItemType,
  AppMenuSecondaryActionItem,
  AppMenuPrimaryActionItem,
  AppMenuPopoverItem,
  AppMenuSplitButtonProps,
} from './src';

export {
  APP_MENU_ITEM_LIMIT,
  APP_MENU_NOTIFICATION_INDICATOR_LEFT,
  APP_MENU_NOTIFICATION_INDICATOR_TOP,
} from './src';

export {
  getDisplayedItemsAllowedAmount,
  getShouldOverflow,
  isDisabled,
  getTooltip,
  mapAppMenuItemToPanelItem,
  getAppMenuItems,
  getPopoverPanels,
  getPopoverActionItems,
  getIsSelectedColor,
} from './src';
