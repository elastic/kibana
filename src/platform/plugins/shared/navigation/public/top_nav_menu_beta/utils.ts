/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunction } from 'lodash';
import type { TopNavMenuConfigBeta, TopNavMenuItemCommonBeta } from './types';
import { TOP_NAV_MENU_ITEM_LIMIT } from './constants';

/**
 * Calculate how many items can be displayed based on the presence of action buttons.
 */
const getDisplayedItemsAllowedAmount = (config: TopNavMenuConfigBeta) => {
  const actionButtonsAmount = [config.primaryActionItem, config.secondaryActionItem].filter(
    Boolean
  ).length;

  return TOP_NAV_MENU_ITEM_LIMIT - actionButtonsAmount;
};

/**
 * Determine if the menu should overflow into a "more" menu.
 */
const getShouldOverflow = ({
  config,
  isMobileMenu,
  displayedItemsAllowedAmount,
}: {
  config: TopNavMenuConfigBeta;
  isMobileMenu: boolean;
  displayedItemsAllowedAmount: number;
}) => config.items.length > displayedItemsAllowedAmount && !isMobileMenu;

/**
 * Split the items into displayed and overflow based on the configuration.
 */
export const getTopNavItems = ({
  config,
  isMobileMenu,
}: {
  config: TopNavMenuConfigBeta;
  isMobileMenu: boolean;
}) => {
  const displayedItemsAllowedAmount = getDisplayedItemsAllowedAmount(config);
  const shouldOverflow = getShouldOverflow({ config, isMobileMenu, displayedItemsAllowedAmount });

  if (!shouldOverflow) {
    return {
      displayedItems: config.items,
      overflowItems: [],
      shouldOverflow: false,
    };
  }

  const overflowItems = config.items.slice(displayedItemsAllowedAmount);

  return {
    displayedItems: config.items.slice(0, displayedItemsAllowedAmount),
    overflowItems,
    shouldOverflow: overflowItems.length > 0,
  };
};

export const isDisabled = (disableButton: TopNavMenuItemCommonBeta['disableButton']) =>
  Boolean(isFunction(disableButton) ? disableButton() : disableButton);

export const getTooltip = (tooltip: TopNavMenuItemCommonBeta['tooltip']): string | undefined =>
  isFunction(tooltip) ? tooltip() : tooltip;
