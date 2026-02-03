/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonColor, EuiButtonProps, EuiHideForProps, IconType } from '@elastic/eui';
import type { SplitButtonWithNotificationProps } from '@kbn/split-button';

/**
 * Parameters passed to AppMenuRunAction
 */
export interface AppMenuRunActionParams {
  /**
   * The HTML element that triggered the action. Do not use this to open popovers. Use `items` property to define popover items instead.
   */
  triggerElement: HTMLElement;
  /**
   * Generic context object that can be used to pass additional data to the run action.
   * Consumers can extend this to add custom properties as needed.
   */
  context?: Record<string, unknown>;
}

/**
 * Type for the function that runs when an app menu item is clicked
 * @param params - Optional parameters object
 */
export type AppMenuRunAction = (params?: AppMenuRunActionParams) => void;

/**
 * Subset of SplitButtonWithNotificationProps.
 */
type BaseSplitProps = Pick<
  SplitButtonWithNotificationProps,
  | 'isMainButtonLoading'
  | 'isMainButtonDisabled'
  | 'isSecondaryButtonLoading'
  | 'isSecondaryButtonDisabled'
  | 'secondaryButtonAriaLabel'
  | 'secondaryButtonTitle'
  | 'secondaryButtonIcon'
  | 'iconType'
  | 'showNotificationIndicator'
  | 'notifcationIndicatorTooltipContent'
>;

type AppMenuSecondarySplitButton = BaseSplitProps & {
  /**
   * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
   */
  items?: never;
  /**
   * Function to run when the item is clicked. Only used if `items` is not provided.
   */
  run: AppMenuRunAction;
};

type AppMenuSecondarySplitButtonWithPopover = BaseSplitProps & {
  /**
   * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
   */
  items: AppMenuPopoverItem[];
  /**
   * Function to run when the item is clicked. Only used if `items` is not provided.
   */
  run?: never;
};

/**
 * Subset of SplitButtonWithNotificationProps.
 */
export type AppMenuSplitButtonProps =
  | AppMenuSecondarySplitButton
  | AppMenuSecondarySplitButtonWithPopover;

interface AppMenuItemBase {
  /**
   * A unique, internal identifier for the item.
   */
  id: string;
  /**
   * A unique identifier for the item, used for HTML `id` attribute.
   */
  htmlId?: string;
  /**
   * The text label for the item.
   */
  label: string;
  /**
   * The icon type for the item.
   */
  iconType: IconType;
  /**
   * A unique identifier for the item, used for testing purposes. Maps to `data-test-subj` attribute.
   */
  testId?: string;
  /**
   * Disables the button if set to `true` or a function that returns `true`.
   */
  disableButton?: boolean | (() => boolean);
  /**
   * Displays a loading indicator on the button if set to `true`.
   */
  isLoading?: boolean;
  /**
   * Tooltip content to show when hovering over the item.
   */
  tooltipContent?: string | (() => string | undefined);
  /**
   * Tooltip title to show when hovering over the item.
   */
  tooltipTitle?: string | (() => string | undefined);
  /**
   * Hides the item at the specified responsive breakpoints.
   * */
  hidden?: EuiHideForProps['sizes'];
}

type AppMenuLinkItem = AppMenuItemBase & {
  /**
   * The HTML href attribute for the item. Only used if `run` and `items` are not provided.
   */
  href: string;
  /**
   * The HTML target attribute for the item. Only used if `run` and `items` are not provided.
   */
  target: string;
  /**
   * Function to run when the item is clicked. Only used if `items` and `href` is not provided.
   */
  run?: never;
  /**
   * Sub-items to show in a popover when the item is clicked. Only used if `run` and `href` is not provided.
   */
  items?: never;
  /**
   * Width of the popover in pixels.
   * Only used if `run` and `href` is not provided.
   */
  popoverWidth?: never;
  /**
   * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
   * Only used if `run` and `href` is not provided.
   */
  popoverTestId?: never;
};

type AppMenuButtonItem = AppMenuItemBase & {
  /**
   * The HTML href attribute for the item. Only used if `run` and `items` are not provided.
   */
  href?: never;
  /**
   * The HTML target attribute for the item. Only used if `run` and `items` are not provided.
   */
  target?: never;
  /**
   * Function to run when the item is clicked. Only used if `items` and `href` is not provided.
   */
  run: AppMenuRunAction;
  /**
   * Sub-items to show in a popover when the item is clicked. Only used if `run` and `href` is not provided.
   */
  items?: never;
  /**
   * Width of the popover in pixels.
   * Only used if `run` and `href` is not provided.
   */
  popoverWidth?: never;
  /**
   * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
   * Only used if `run` and `href` is not provided.
   */
  popoverTestId?: never;
};

type AppMenuItemWithPopover = AppMenuItemBase & {
  /**
   * The HTML href attribute for the item. Only used if `run` and `items` are not provided.
   */
  href?: never;
  /**
   * The HTML target attribute for the item. Only used if `run` and `items` are not provided.
   */
  target?: never;
  /**
   * Function to run when the item is clicked. Only used if `items` and `href` is not provided.
   */
  run?: never;
  /**
   * Sub-items to show in a popover when the item is clicked. Only used if `run` and `href` is not provided.
   */
  items: AppMenuPopoverItem[];
  /**
   * Width of the popover in pixels.
   */
  popoverWidth?: number;
  /**
   * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
   * Only used if `run` and `href` is not provided.
   */
  popoverTestId?: string;
};

export type AppMenuItemCommon = AppMenuButtonItem | AppMenuItemWithPopover | AppMenuLinkItem;

/**
 * Full item type for use in `config.items` arrays.
 */
export type AppMenuItemType = AppMenuItemCommon & {
  /**
   * Order of the item in the menu. Lower numbers appear first.
   */
  order: number;
};

/**
 * Popover item type for use in `items` arrays.
 */
export type AppMenuPopoverItem = Omit<AppMenuItemType, 'iconType' | 'hidden' | 'popoverWidth'> & {
  /**
   * The icon type for the item.
   */
  iconType?: IconType;
  /**
   * Adds a separator line above or below the item in the popover menu.
   */
  separator?: 'above' | 'below';
};

type AppMenuActionButton = Omit<AppMenuItemCommon, 'order'> & {
  /**
   * The color of the button.
   */
  color?: EuiButtonColor;
};

/**
 * Secondary action button type. Can't be a split button.
 */
export type AppMenuSecondaryActionItem = AppMenuActionButton & {
  /**
   * Whether the button should be filled.
   */
  isFilled?: boolean;
  /**
   * Equal to EUI `minWidth` property.
   */
  minWidth?: EuiButtonProps['minWidth'];
};

/**
 * Primary action button type. Can be either a simple button or a split button.
 */
export type AppMenuPrimaryActionItem =
  /**
   * The main part of the button should never open a popover.
   */
  Omit<AppMenuActionButton, 'items'> & {
    /**
     * Subset of SplitButtonWithNotificationProps.
     */
    splitButtonProps?: AppMenuSplitButtonProps;
  };

/**
 * Configuration object for the AppMenu component.
 */
export interface AppMenuConfig {
  /**
   * List of menu items to display in the app menu.
   */
  items?: AppMenuItemType[];
  /**
   * Primary action button to display in the app menu.
   */
  primaryActionItem?: AppMenuPrimaryActionItem;
  /**
   * Secondary action button to display in the app menu.
   */
  secondaryActionItem?: AppMenuSecondaryActionItem;
}
