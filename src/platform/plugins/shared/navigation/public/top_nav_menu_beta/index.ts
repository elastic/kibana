/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { TopNavMenuBeta } from './top_nav_menu_beta';
export { TopNavMenuItem } from './top_nav_menu_item';
export { TopNavMenuActionButton } from './top_nav_menu_action_button';
export { TopNavMenuOverflowButton } from './top_nav_menu_overflow_button';
export { TopNavMenuPopover } from './top_nav_menu_popover';
export { TopNavMenuPopoverActionButtons } from './top_nav_menu_popover_action_buttons';

export type {
  TopNavMenuConfigBeta,
  TopNavMenuItemType,
  TopNavMenuSecondaryActionItem,
  TopNavMenuPrimaryActionItem,
  TopNavMenuPopoverItem,
  TopNavMenuSplitButtonProps,
} from './types';

export {
  TOP_NAV_MENU_ITEM_LIMIT,
  TOP_NAV_MENU_NOTIFICATION_INDICATOR_LEFT,
  TOP_NAV_MENU_NOTIFICATION_INDICATOR_TOP,
} from './constants';

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
} from './utils';
