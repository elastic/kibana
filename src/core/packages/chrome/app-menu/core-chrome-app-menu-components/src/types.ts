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

/**
 * Subset of SplitButtonWithNotificationProps.
 */
export type AppMenuSplitButtonProps =
  /**
   * If `items` is provided then `run` shouldn't be, as having items means the button opens a popover.
   */
  | (BaseSplitProps & {
      /**
       * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
       */
      items?: undefined;
      /**
       * Function to run when the item is clicked. Only used if `items` is not provided.
       */
      run: () => void;
    })
  | (BaseSplitProps & {
      /**
       * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
       */
      items: AppMenuPopoverItem[];
      /**
       * Function to run when the item is clicked. Only used if `items` is not provided.
       */
      run?: never;
    });

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
   * The HTML target attribute for the item.
   */
  target?: string;
  /**
   * The HTML href attribute for the item.
   */
  href?: string;
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

export type AppMenuItemCommon =
  /**
   * If `items` is provided then `run` shouldn't be, as having items means the button opens a popover.
   */
  | (AppMenuItemBase & {
      /**
       * Function to run when the item is clicked. Only used if `items` is not provided.
       */
      run: () => void;
      /**
       * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
       */
      items?: undefined;
      /**
       * Width of the popover in pixels.
       */
      popoverWidth?: never;
      /**
       * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
       */
      popoverTestId?: never;
    })
  | (AppMenuItemBase & {
      /**
       * Function to run when the item is clicked. Only used if `items` is not provided.
       */
      run?: never;
      /**
       * Sub-items to show in a popover when the item is clicked. Only used if `run` is not provided.
       */
      items: AppMenuPopoverItem[];
      /**
       * Width of the popover in pixels.
       */
      popoverWidth?: number;
      /**
       * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
       */
      popoverTestId?: string;
    });

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

/**
 * Secondary action button type. Can only be a simple button.
 */
export type AppMenuSecondaryActionItem = AppMenuItemCommon & {
  /**
   * The color of the button.
   */
  color?: EuiButtonColor;
  /**
   * * Whether the button should be filled.
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
  Omit<AppMenuItemCommon, 'items'> & {
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
   * List of menu items to display in the top navigation menu.
   */
  items?: AppMenuItemType[];
  /**
   * Primary action button to display in the top navigation menu.
   */
  primaryActionItem?: AppMenuPrimaryActionItem;
  /**
   * Secondary action button to display in the top navigation menu.
   */
  secondaryActionItem?: AppMenuSecondaryActionItem;
}
