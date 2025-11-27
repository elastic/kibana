/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isFunction, upperFirst } from 'lodash';
import type { EuiButtonColor, EuiThemeComputed, EuiContextMenuPanelDescriptor } from '@elastic/eui';
import type {
  TopNavMenuConfigBeta,
  TopNavMenuItemCommonBeta,
  TopNavMenuPopoverItemBeta,
} from './types';
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
  displayedItemsAllowedAmount,
}: {
  config: TopNavMenuConfigBeta;
  displayedItemsAllowedAmount: number;
}) => {
  if (!config.items) {
    return false;
  }

  return config.items.length > displayedItemsAllowedAmount;
};

/**
 * Split the items into displayed and overflow based on the configuration.
 */
export const getTopNavItems = ({ config }: { config: TopNavMenuConfigBeta }) => {
  if (!config.items) {
    return {
      displayedItems: [],
      overflowItems: [],
      shouldOverflow: false,
    };
  }

  const displayedItemsAllowedAmount = getDisplayedItemsAllowedAmount(config);
  const shouldOverflow = getShouldOverflow({ config, displayedItemsAllowedAmount });

  const sortedItems = [...config.items].sort((a, b) => a.order - b.order);

  if (!shouldOverflow) {
    return {
      displayedItems: sortedItems,
      overflowItems: [],
      shouldOverflow: false,
    };
  }

  const overflowItems = sortedItems.slice(displayedItemsAllowedAmount);

  return {
    displayedItems: sortedItems.slice(0, displayedItemsAllowedAmount),
    overflowItems,
    shouldOverflow: overflowItems.length > 0,
  };
};

export const isDisabled = (disableButton: TopNavMenuItemCommonBeta['disableButton']) =>
  Boolean(isFunction(disableButton) ? disableButton() : disableButton);

export const getTooltip = ({
  tooltipContent,
  tooltipTitle,
}: {
  tooltipContent?: TopNavMenuItemCommonBeta['tooltipContent'];
  tooltipTitle?: TopNavMenuItemCommonBeta['tooltipTitle'];
}) => {
  const content = isFunction(tooltipContent) ? tooltipContent() : tooltipContent;
  const title = isFunction(tooltipTitle) ? tooltipTitle() : tooltipTitle;

  return {
    title,
    content,
  };
};

export const hasNoItems = (config: TopNavMenuConfigBeta) =>
  !config.items?.length && !config?.primaryActionItem && !config?.secondaryActionItem;

const mapTopNavItemToPanelItem = (item: TopNavMenuPopoverItemBeta, childPanelId?: number) => {
  return {
    key: item.id,
    name: upperFirst(item.label),
    icon: item.iconType,
    onClick:
      item?.href || childPanelId !== undefined
        ? undefined
        : () => {
            item.run?.();
          },
    href: item?.href,
    target: item?.target,
    disabled: isDisabled(item?.disableButton),
    ...(childPanelId !== undefined && { panel: childPanelId }),
  };
};

/**
 * Recursively generate EUI context menu panels from the provided menu items.
 */
export const getPopoverPanels = (
  menuItems: TopNavMenuPopoverItemBeta[],
  startPanelId: number = 0
): EuiContextMenuPanelDescriptor[] => {
  const panels: EuiContextMenuPanelDescriptor[] = [];
  let currentPanelId = startPanelId;

  const processItems = (
    itemsToProcess: TopNavMenuPopoverItemBeta[],
    panelId: number,
    parentTitle?: string
  ) => {
    const panelItems = itemsToProcess.map((item) => {
      if (item.items && item.items.length > 0) {
        currentPanelId++;
        const childPanelId = currentPanelId;

        processItems(item.items, childPanelId, item.label);
        return mapTopNavItemToPanelItem(item, childPanelId);
      }
      return mapTopNavItemToPanelItem(item);
    });

    panels.push({
      id: panelId,
      ...(parentTitle && { title: parentTitle }),
      items: panelItems,
    });
  };

  processItems(menuItems, startPanelId);
  return panels;
};

/**
 * Get the background color for a button associated when popover is open.
 */
export const getIsSelectedColor = ({
  color,
  euiTheme,
  isFilled,
}: {
  color: EuiButtonColor;
  euiTheme: EuiThemeComputed;
  isFilled: boolean;
}) => {
  switch (color) {
    case 'warning':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledWarningHover
        : euiTheme.components.buttons.backgroundEmptyWarningHover;
    case 'text':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledTextHover
        : euiTheme.components.buttons.backgroundEmptyTextHover;
    case 'accent':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledAccentHover
        : euiTheme.components.buttons.backgroundEmptyAccentHover;
    case 'accentSecondary':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledAccentSecondaryHover
        : euiTheme.components.buttons.backgroundEmptyAccentSecondaryHover;
    case 'primary':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledPrimaryHover
        : euiTheme.components.buttons.backgroundEmptyPrimaryHover;
    case 'success':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledSuccessHover
        : euiTheme.components.buttons.backgroundEmptySuccessHover;
    case 'danger':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledDangerHover
        : euiTheme.components.buttons.backgroundEmptyDangerHover;
    case 'neutral':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledNeutralHover
        : euiTheme.components.buttons.backgroundEmptyNeutralHover;
    case 'risk':
      return isFilled
        ? euiTheme.components.buttons.backgroundFilledRiskHover
        : euiTheme.components.buttons.backgroundEmptyRiskHover;
    default:
      return undefined;
  }
};
