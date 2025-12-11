/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { TopNavMenuBeta } from './src';
export { TopNavMenuItem } from './src';
export { TopNavMenuActionButton } from './src';
export { TopNavMenuOverflowButton } from './src';
export { TopNavMenuPopover } from './src';
export { TopNavMenuPopoverActionButtons } from './src';

export type {
  TopNavMenuConfigBeta,
  TopNavMenuItemType,
  TopNavMenuSecondaryActionItem,
  TopNavMenuPrimaryActionItem,
  TopNavMenuPopoverItem,
  TopNavMenuSplitButtonProps,
} from './src';

export {
  TOP_NAV_MENU_ITEM_LIMIT,
  TOP_NAV_MENU_NOTIFICATION_INDICATOR_LEFT,
  TOP_NAV_MENU_NOTIFICATION_INDICATOR_TOP,
} from './src';

export {
  getDisplayedItemsAllowedAmount,
  getShouldOverflow,
  isDisabled,
  getTooltip,
  mapTopNavItemToPanelItem,
  getTopNavItems,
  getPopoverPanels,
  getPopoverActionItems,
  getIsSelectedColor,
} from './src';
