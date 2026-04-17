/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiButtonProps, EuiHideForProps, IconType } from '@elastic/eui';
import type { ReactNode } from 'react';
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
   * Optional content rendered after the capitalized label (e.g. a count badge).
   */
  labelAppend?: ReactNode;
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
   * The HTML href attribute for the item. Only used if `items` is not provided.
   */
  href: string;
  /**
   * The HTML target attribute for the item. Only used if `items` is not provided.
   */
  target: string;
  /**
   * Function to run when the item is clicked. Only used if `items` is not provided.
   */
  run?: AppMenuRunAction;
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
   * The HTML href attribute for the item. Only used if `items` is not provided.
   */
  href?: string;
  /**
   * The HTML target attribute for the item. Only used if `items` is not provided.
   */
  target?: string;
  /**
   * Function to run when the item is clicked. Only used if `items` is not provided.
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
   * The HTML href attribute for the item. Only used if `items` is not provided.
   */
  href?: never;
  /**
   * The HTML target attribute for the item. Only used if `items` is not provided.
   */
  target?: never;
  /**
   * Function to run when the item is clicked. Only used if `items` is not provided.
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
  /**
   * In overflow / popover menus, draws a horizontal rule above or below this item.
   */
  separator?: 'above' | 'below';
};

/**
 * Popover item type for use in `items` arrays.
 */
export type AppMenuPopoverItem = Omit<AppMenuItemType, 'iconType' | 'hidden' | 'popoverWidth'> & {
  /**
   * The icon type for the item.
   */
  iconType?: IconType;
};

/**
 * Action buttons in the app menu always render with EUI `color="text"` for visual consistency.
 */
type AppMenuActionButton = Omit<AppMenuItemCommon, 'order'>;

/**
 * Secondary action button type. Can't be a split button.
 */
export type AppMenuSecondaryActionItem = AppMenuActionButton & {
  /**
   * Ignored: secondary header actions render as EuiButtonEmpty (borderless).
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
    /**
     * Ignored in the chrome app menu: primary actions always use the default (empty) EUI button display.
     */
    isFilled?: boolean;
  };

/**
 * Visual / structural layout for the chrome app menu strip.
 */
export type AppMenuLayout = 'default' | 'chromeBarV2';

/**
 * A tab rendered in the project chrome application top bar (between the title and inline actions).
 * Not used by `AppMenuComponent`; it is consumed only by core chrome layout (`AppMenuBar`).
 */
export interface AppMenuHeaderTab {
  /**
   * Stable id for React keys and testing.
   */
  id: string;
  /**
   * Tab label (plain string or translated React node).
   */
  label: ReactNode;
  /**
   * Optional content after the label (EuiTab `append` prop) for correct alignment with the tab title.
   */
  append?: ReactNode;
  isSelected: boolean;
  /**
   * Invoked when the tab is activated (e.g. in-app routing).
   */
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  /**
   * Optional href; prefer the `onClick` handler with the application router when possible.
   */
  href?: string;
  testId?: string;
  /**
   * When true, the tab is not interactive (e.g. disabled Alerts for remote SLOs).
   */
  disabled?: boolean;
}

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
  /**
   * When `chromeBarV2`, the strip follows
   * `[secondary actions…][overflow ⋯][primary action]` (desktop).
   * Prefer {@link overflowOnlyItems} and {@link secondaryActionItems} instead of
   * legacy `items` for overflow vs inline split.
   */
  layout?: AppMenuLayout;
  /**
   * Multiple secondary actions (empty / text button style), before the overflow control.
   */
  secondaryActionItems?: AppMenuSecondaryActionItem[];
  /**
   * Optional controls rendered after {@link secondaryActionItems} / {@link secondaryActionItem}
   * and before the overflow (⋯) control. Use when an action does not fit {@link AppMenuSecondaryActionItem}
   * (for example, a rich popover instead of a context menu).
   */
  secondaryActionAppend?: ReactNode;
  /**
   * Entries shown only inside the overflow (⋯) popover, never as inline header links.
   */
  overflowOnlyItems?: AppMenuItemType[];
  /**
   * Tabs shown in the project chrome application top bar (AppMenuBar), left of the action menu.
   * Omitted when rendering {@link AppMenuComponent} so actions strip logic stays unchanged.
   */
  headerTabs?: AppMenuHeaderTab[];
  /**
   * Optional metadata row below the page title in project chrome application top bar.
   * Each entry is typically `EuiText` with `size="xs"` (labels often use `<strong>`).
   * Omitted when rendering {@link AppMenuComponent} so actions strip logic stays unchanged.
   */
  headerMetadata?: ReactNode[];
  /**
   * Optional badge group inline in the title row (project chrome `AppMenuBar`), after the title
   * and before the global action icons. Each entry is typically an `EuiBadge`.
   * Omitted when rendering {@link AppMenuComponent} so actions strip logic stays unchanged.
   */
  headerBadges?: ReactNode[];
  /**
   * When true, the project chrome application top bar hides the back-to-parent control (chevron
   * next to the title). Use when breadcrumb hierarchy is flat or the parent link would duplicate
   * the current route.
   */
  hideProjectHeaderBackButton?: boolean;
  /**
   * When true, the project chrome `AppMenuBar` root omits its bottom border (e.g. Discover uses
   * the document area edge instead of a rule under the top nav).
   */
  hideProjectHeaderBottomBorder?: boolean;
}
