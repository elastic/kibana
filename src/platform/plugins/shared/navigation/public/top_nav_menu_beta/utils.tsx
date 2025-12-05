/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { isArray, isFunction, upperFirst } from 'lodash';
import {
  type EuiButtonColor,
  type EuiThemeComputed,
  type EuiContextMenuPanelDescriptor,
  type EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { TopNavMenuPopoverActionButtons } from './top_nav_menu_popover_action_buttons';
import type {
  TopNavMenuConfigBeta,
  TopNavMenuItemCommon,
  TopNavMenuPopoverItem,
  TopNavMenuPrimaryActionItem,
  TopNavMenuSecondaryActionItem,
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

export const isDisabled = (disableButton: TopNavMenuItemCommon['disableButton']) =>
  Boolean(isFunction(disableButton) ? disableButton() : disableButton);

export const getTooltip = ({
  tooltipContent,
  tooltipTitle,
}: {
  tooltipContent?: TopNavMenuItemCommon['tooltipContent'];
  tooltipTitle?: TopNavMenuItemCommon['tooltipTitle'];
}) => {
  const content = isFunction(tooltipContent) ? tooltipContent() : tooltipContent;
  const title = isFunction(tooltipTitle) ? tooltipTitle() : tooltipTitle;

  return {
    title,
    content,
  };
};

const mapTopNavItemToPanelItem = (item: TopNavMenuPopoverItem, childPanelId?: number) => {
  const { content, title } = getTooltip({
    tooltipContent: item?.tooltipContent,
    tooltipTitle: item?.tooltipTitle,
  });

  return {
    key: item.id,
    name: upperFirst(item.label),
    icon: item?.iconType,
    onClick:
      item?.href || childPanelId !== undefined
        ? undefined
        : () => {
            item.run?.();
          },
    href: item?.href,
    target: item?.target,
    disabled: isDisabled(item?.disableButton),
    'data-test-subj': item?.testId,
    toolTipContent: content,
    toolTipProps: {
      title,
    },
    ...(childPanelId !== undefined && { panel: childPanelId }),
  } as EuiContextMenuPanelItemDescriptor;
};

/**
 * Generate action items for the popover menu. This is only used below "m" breakpoint.
 */
const getPopoverActionItems = ({
  primaryActionItem,
  secondaryActionItem,
}: {
  primaryActionItem?: TopNavMenuPrimaryActionItem;
  secondaryActionItem?: TopNavMenuSecondaryActionItem;
}) => {
  if (!primaryActionItem && !secondaryActionItem) {
    return [];
  }

  const isHidden = (
    item: TopNavMenuPrimaryActionItem | TopNavMenuSecondaryActionItem | undefined
  ) => {
    if (!item) return true;

    const isHiddenInMobile =
      isArray(item?.hidden) &&
      (item.hidden.includes('m') || item.hidden.includes('s') || item.hidden.includes('xs'));

    return item?.hidden === 'all' || isHiddenInMobile;
  };

  const bothButtonsAreHidden = isHidden(primaryActionItem) && isHidden(secondaryActionItem);

  if (bothButtonsAreHidden) {
    return [];
  }

  return [
    {
      key: 'action-buttons-separator',
      id: 'action-buttons-separator',
      isSeparator: true,
    },
    {
      key: 'action-items',
      id: 'action-items',
      renderItem: () => (
        <TopNavMenuPopoverActionButtons
          primaryActionItem={primaryActionItem}
          secondaryActionItem={secondaryActionItem}
        />
      ),
    },
  ] as EuiContextMenuPanelItemDescriptor[];
};

/**
 * Recursively generate EUI context menu panels from the provided menu items.
 */
export const getPopoverPanels = ({
  menuItems,
  primaryActionItem,
  secondaryActionItem,
}: {
  menuItems: TopNavMenuPopoverItem[];
  primaryActionItem?: Omit<TopNavMenuItemCommon, 'items'> & { splitButtonProps?: any };
  secondaryActionItem?: TopNavMenuItemCommon & {
    color?: EuiButtonColor;
    isFilled?: boolean;
    minWidth?: any;
  };
  startPanelId?: number;
}): EuiContextMenuPanelDescriptor[] => {
  const panels: EuiContextMenuPanelDescriptor[] = [];
  const hasActionItems = Boolean(primaryActionItem || secondaryActionItem);
  const startPanelId = 0;
  let currentPanelId = startPanelId;

  const processItems = (
    itemsToProcess: TopNavMenuPopoverItem[],
    panelId: number,
    parentTitle?: string
  ) => {
    const panelItems: EuiContextMenuPanelItemDescriptor[] = [];

    itemsToProcess.forEach((item) => {
      if (item.seperator === 'above') {
        panelItems.push({
          isSeparator: true,
          key: `separator-${item.id}`,
        } as EuiContextMenuPanelItemDescriptor);
      }

      if (item.items && item.items.length > 0) {
        currentPanelId++;
        const childPanelId = currentPanelId;

        processItems(item.items, childPanelId, item.label);
        panelItems.push(mapTopNavItemToPanelItem(item, childPanelId));
      } else {
        panelItems.push(mapTopNavItemToPanelItem(item));
      }

      if (item.seperator === 'below') {
        panelItems.push({
          isSeparator: true,
          key: `separator-${item.id}`,
        } as EuiContextMenuPanelItemDescriptor);
      }
    });

    panels.push({
      id: panelId,
      ...(parentTitle && { title: upperFirst(parentTitle) }),
      items: panelItems,
    });
  };

  processItems(menuItems, startPanelId);
  if (hasActionItems) {
    const mainPanel = panels.find((panel) => panel.id === startPanelId);

    if (!mainPanel) return panels;

    const actionItems: EuiContextMenuPanelItemDescriptor[] = getPopoverActionItems({
      primaryActionItem,
      secondaryActionItem,
    });

    mainPanel.items = [...(mainPanel.items as EuiContextMenuPanelItemDescriptor[]), ...actionItems];

    return panels;
  }

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
