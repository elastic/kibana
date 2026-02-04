/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type MouseEvent } from 'react';
import { isArray, isFunction, upperFirst } from 'lodash';
import {
  type EuiButtonColor,
  type EuiThemeComputed,
  type EuiContextMenuPanelDescriptor,
  type EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { getRouterLinkProps } from '@kbn/router-utils';
import { AppMenuPopoverActionButtons } from './components/app_menu_popover_action_buttons';
import type {
  AppMenuConfig,
  AppMenuItemCommon,
  AppMenuPopoverItem,
  AppMenuPrimaryActionItem,
  AppMenuSecondaryActionItem,
} from './types';
import { APP_MENU_ITEM_LIMIT, DEFAULT_POPOVER_WIDTH } from './constants';

/**
 * Calculate how many items can be displayed based on the presence of action buttons.
 */
export const getDisplayedItemsAllowedAmount = (config: AppMenuConfig) => {
  const actionButtonsAmount = [config.primaryActionItem, config.secondaryActionItem].filter(
    Boolean
  ).length;

  return APP_MENU_ITEM_LIMIT - actionButtonsAmount;
};

/**
 * Determine if the menu should overflow into a "more" menu.
 */
export const getShouldOverflow = ({
  config,
  displayedItemsAllowedAmount,
}: {
  config: AppMenuConfig;
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
export const getAppMenuItems = ({ config }: { config: AppMenuConfig }) => {
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

export const isDisabled = (disableButton: AppMenuItemCommon['disableButton']) =>
  Boolean(isFunction(disableButton) ? disableButton() : disableButton);

export const getTooltip = ({
  tooltipContent,
  tooltipTitle,
}: {
  tooltipContent?: AppMenuItemCommon['tooltipContent'];
  tooltipTitle?: AppMenuItemCommon['tooltipTitle'];
}) => {
  const content = isFunction(tooltipContent) ? tooltipContent() : tooltipContent;
  const title = isFunction(tooltipTitle) ? tooltipTitle() : tooltipTitle;

  return {
    title,
    content,
  };
};

export const mapAppMenuItemToPanelItem = (
  item: AppMenuPopoverItem,
  childPanelId?: number,
  onClose?: () => void,
  onCloseOverflowButton?: () => void
): EuiContextMenuPanelItemDescriptor => {
  const { content, title } = getTooltip({
    tooltipContent: item?.tooltipContent,
    tooltipTitle: item?.tooltipTitle,
  });

  const handleClick = (event: MouseEvent) => {
    if (isDisabled(item?.disableButton)) {
      return;
    }

    const shouldClosePopover = !item?.href && childPanelId === undefined && onClose;

    item.run?.({ triggerElement: event?.currentTarget as HTMLElement });

    if (shouldClosePopover) {
      onClose();
      onCloseOverflowButton?.();
    }
  };

  const hasClickHandler = childPanelId === undefined;
  const routerLinkProps =
    item?.href && item?.run && hasClickHandler
      ? getRouterLinkProps({ href: item.href, onClick: handleClick })
      : { onClick: hasClickHandler ? handleClick : undefined };

  return {
    key: item.id,
    name: upperFirst(item.label),
    icon: item?.iconType,
    ...routerLinkProps,
    href: item?.href,
    target: item?.href ? item?.target : undefined,
    disabled: isDisabled(item?.disableButton),
    'data-test-subj': item?.testId,
    toolTipContent: content,
    toolTipProps: {
      title,
    },
    ...(childPanelId !== undefined && { panel: childPanelId }),
  };
};

const createSeparatorItem = (key: string): EuiContextMenuPanelItemDescriptor => ({
  isSeparator: true,
  key,
});

/**
 * Generate action items for the popover menu. This is only used below "m" breakpoint.
 */
export const getPopoverActionItems = ({
  primaryActionItem,
  secondaryActionItem,
  onCloseOverflowButton,
}: {
  primaryActionItem?: AppMenuPrimaryActionItem;
  secondaryActionItem?: AppMenuSecondaryActionItem;
  onCloseOverflowButton?: () => void;
}): EuiContextMenuPanelItemDescriptor[] => {
  if (!primaryActionItem && !secondaryActionItem) {
    return [];
  }

  const isHidden = (item: AppMenuPrimaryActionItem | AppMenuSecondaryActionItem | undefined) => {
    if (!item) return true;

    const isHiddenInMobile =
      isArray(item?.hidden) &&
      // Check if any of the hidden values match mobile breakpoints
      (item.hidden.includes('m') || item.hidden.includes('s') || item.hidden.includes('xs'));

    return item?.hidden === 'all' || isHiddenInMobile;
  };

  const bothButtonsAreHidden = isHidden(primaryActionItem) && isHidden(secondaryActionItem);

  if (bothButtonsAreHidden) {
    return [];
  }

  const separator = createSeparatorItem('action-items-separator');

  return [
    separator,
    {
      key: 'action-items',
      renderItem: () => (
        <AppMenuPopoverActionButtons
          primaryActionItem={primaryActionItem}
          secondaryActionItem={secondaryActionItem}
          onCloseOverflowButton={onCloseOverflowButton}
        />
      ),
    },
  ];
};

/**
 * Recursively generate EUI context menu panels from the provided menu items.
 */
export const getPopoverPanels = ({
  items,
  primaryActionItem,
  secondaryActionItem,
  startPanelId = 0,
  rootPanelWidth = DEFAULT_POPOVER_WIDTH,
  rootPopoverTestId,
  onClose,
  onCloseOverflowButton,
}: {
  items: AppMenuPopoverItem[];
  primaryActionItem?: AppMenuPrimaryActionItem;
  secondaryActionItem?: AppMenuSecondaryActionItem;
  startPanelId?: number;
  rootPanelWidth?: number;
  rootPopoverTestId?: string;
  onClose?: () => void;
  onCloseOverflowButton?: () => void;
}): EuiContextMenuPanelDescriptor[] => {
  const panels: EuiContextMenuPanelDescriptor[] = [];
  const hasActionItems = Boolean(primaryActionItem || secondaryActionItem);
  let currentPanelId = startPanelId;

  const processItems = ({
    itemsToProcess,
    panelId,
    parentTitle,
    parentPopoverTestId,
    parentPopoverWidth,
  }: {
    itemsToProcess: AppMenuPopoverItem[];
    panelId: number;
    parentTitle?: string;
    parentPopoverTestId?: string;
    parentPopoverWidth?: number;
  }) => {
    const panelItems: EuiContextMenuPanelItemDescriptor[] = [];

    const sortedItems = [...itemsToProcess].sort((a, b) => a.order - b.order);

    sortedItems.forEach((item) => {
      if (item.separator === 'above') {
        panelItems.push(createSeparatorItem(`separator-${item.id}`));
      }

      if (item.items && item.items.length > 0) {
        currentPanelId++;
        const childPanelId = currentPanelId;

        // popoverWidth may exist on items that are AppMenuItemType (e.g., overflow items)
        const itemPopoverWidth =
          'popoverWidth' in item ? (item as { popoverWidth?: number }).popoverWidth : undefined;
        processItems({
          itemsToProcess: item.items,
          panelId: childPanelId,
          parentTitle: item.label,
          parentPopoverTestId: item.popoverTestId,
          parentPopoverWidth: itemPopoverWidth ?? DEFAULT_POPOVER_WIDTH,
        });
        panelItems.push(
          mapAppMenuItemToPanelItem(item, childPanelId, onClose, onCloseOverflowButton)
        );
      } else {
        panelItems.push(mapAppMenuItemToPanelItem(item, undefined, onClose, onCloseOverflowButton));
      }

      if (item.separator === 'below') {
        panelItems.push(createSeparatorItem(`separator-${item.id}`));
      }
    });

    panels.push({
      id: panelId,
      ...(parentTitle && { title: upperFirst(parentTitle) }),
      ...(parentPopoverTestId && { 'data-test-subj': parentPopoverTestId }),
      ...(parentPopoverWidth && { width: parentPopoverWidth }),
      items: panelItems,
    });
  };

  processItems({
    itemsToProcess: items,
    panelId: startPanelId,
    parentPopoverTestId: rootPopoverTestId,
    parentPopoverWidth: rootPanelWidth,
  });

  /**
   * Action items are only added to the main panel and only in lower breakpoints (below "m").
   * They should not be available to be added via config.
   */
  if (hasActionItems) {
    const mainPanel = panels.find((panel) => panel.id === startPanelId);

    if (!mainPanel) return panels;

    const actionItems: EuiContextMenuPanelItemDescriptor[] = getPopoverActionItems({
      primaryActionItem,
      secondaryActionItem,
      onCloseOverflowButton: onClose,
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
  /**
   * Construct the color key based on whether the button is filled or empty e.g. backgroundFilledPrimaryHover.
   */
  const colorKey = `background${isFilled ? 'Filled' : 'Empty'}${upperFirst(
    color
  )}Hover` as keyof typeof euiTheme.components.buttons;

  return euiTheme.components.buttons[colorKey] || euiTheme.colors.backgroundBaseInteractiveHover;
};
