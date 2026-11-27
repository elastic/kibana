/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for the `@kbn/ui-app-menu` external package.
 *
 * Types are defined here (not re-exported from the source) so that declaration
 * generation only depends on the package's peer dependencies (`react`,
 * `@elastic/eui`) and never pulls in the Kibana dependency graph. Build-time
 * validation in `type_validation.ts` ensures these stay in sync with the
 * source types and exports.
 *
 * The data types below mirror `src/types.ts`; the split button props are
 * inlined from `SplitButtonWithNotificationProps`.
 *
 * @see {@link ./type_validation.ts} for the compatibility check.
 */

import type * as React from 'react';
import type {
  EuiButtonColor,
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
  EuiHideForProps,
  EuiSwitchProps,
  EuiThemeComputed,
  IconType,
  PopoverAnchorPosition,
} from '@elastic/eui';
/**
 * Parameters passed to AppMenuRunAction
 */
export interface AppMenuRunActionParams {
  /**
   * The HTML element that triggered the action. Do not use this to open popovers. Use `items` property to define popover items instead.
   */
  triggerElement: HTMLElement;
  /**
   * Returns focus to the originating app menu control (or an internal fallback such as
   * the overflow button). This is useful when a run action opens and later closes a
   * modal/flyout/dialog that should restore keyboard focus.
   */
  returnFocus: () => void;
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
interface BaseSplitProps {
  isMainButtonLoading?: boolean;
  isMainButtonDisabled?: boolean;
  isSecondaryButtonDisabled?: boolean;
  secondaryButtonAriaLabel: string;
  secondaryButtonTooltipContent?: string;
  iconType?: IconType;
  showNotificationIndicator?: boolean;
  notificationIndicatorTooltipContent?: string;
}

type AppMenuSecondarySplitButton = BaseSplitProps & {
  /**
   * Icon for the secondary button. Defaults to a chevron.
   */
  secondaryButtonIconType?: IconType;
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
   * The secondary button always shows a chevron when it opens a popover.
   */
  secondaryButtonIconType?: never;
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

/**
 * Optional Event-Based Telemetry (EBT) click attributes for an app menu control.
 * Rendered as `data-ebt-*` DOM attributes so core click tracking can collect them.
 *
 * `data-ebt-element` is always set to `appMenu` by the renderer — plugins only supply
 * `action` (and optional `detail`).
 *
 * Prefer action values from `@kbn/ebt-click` (`EBT_CLICK_ACTIONS` / plugin-local constants).
 * Shape intentionally omits a hard dependency on that package (this package is Kibana-agnostic).
 */
export interface AppMenuEbtAttrs {
  /**
   * User intent for the click. Maps to `data-ebt-action` / `click.action`.
   */
  action: string;
  /**
   * Optional extra context. Maps to `data-ebt-detail` / `click.detail`.
   */
  detail?: string;
}

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
   * Optional supporting text rendered below the label. Only shown when the item is rendered
   * inside a popover menu (sub-items, static items, and items moved to the "More" menu);
   * ignored for inline top-level buttons and for the primary action button.
   */
  description?: string;
  /**
   * The icon type for the item.
   */
  iconType: IconType;
  /**
   * A unique identifier for the item, used for testing purposes. Maps to `data-test-subj` attribute.
   */
  testId?: string;
  /**
   * Optional EBT click attributes. Mapped to `data-ebt-action` and optionally
   * `data-ebt-detail` on the rendered control. `data-ebt-element` is always `appMenu`.
   */
  ebt?: AppMenuEbtAttrs;
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
  /**
   * Renders the item in a "pressed" visual state, for toggle-style buttons whose action
   * opens/closes a paired UI (e.g. a side panel). When the item is displayed inline it uses
   * `aria-pressed`; when it collapses into the overflow "More" popover the pressed state is
   * shown with a highlighted background.
   * Ignored for items with sub-items — those already reflect popover-open state.
   */
  isSelected?: boolean;
}

type AppMenuLinkItem = AppMenuItemBase & {
  /**
   * The HTML href attribute for the item. Only used if `items` is not provided.
   */
  href: string;
  /**
   * The HTML target attribute for the item. Only used if `items` is not provided.
   */
  target?: string;
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

type AppMenuItemCommon = AppMenuButtonItem | AppMenuItemWithPopover | AppMenuLinkItem;

type AppMenuItemTypeBase = AppMenuItemCommon & {
  /**
   * Order of the item in the menu. Lower numbers appear first. Defaults to 0.
   * Items with the same order preserve their array order.
   */
  order?: number;
  /**
   * Adds a separator line above or below the item when rendered inside a popover menu.
   * Ignored for top-level, non-popover items.
   */
  separator?: 'above' | 'below';
};

type AppMenuItemTopLevel = AppMenuItemTypeBase & {
  overflow?: boolean;
  isDestructive?: never;
};

type AppMenuItemOverflow = AppMenuItemTypeBase & {
  /**
   * The item will be moved to the "More" menu. Only used in top-level items, not in popover items.
   */
  overflow: true;
  /**
   * Marks the item as destructive (e.g. delete) by rendering in danger/red color.
   */
  isDestructive?: boolean;
};

/**
 * Full item type for use in `config.items` arrays.
 * Can be a top-level item or an overflow item.
 *
 */
export type AppMenuItemType = AppMenuItemTopLevel | AppMenuItemOverflow;

export type AppMenuStaticItem = AppMenuItemType & {
  /**
   * Global static items are singleton items that are registered once
   * and are shared across all app menus.
   */
  global?: boolean;
};

/**
 * Popover item type for use in `items` arrays.
 */
export type AppMenuPopoverItem = Omit<
  AppMenuItemType,
  'iconType' | 'hidden' | 'popoverWidth' | 'overflow'
> & {
  /**
   * The icon type for the item.
   */
  iconType?: IconType;
  /**
   * Optional badge text displayed after the label (e.g. "New").
   * Rendered as an inline EuiBadge next to the item name.
   */
  labelBadgeText?: string;
};

interface AppMenuSwitch {
  id: string;
  label: string;
  labelProps?: Omit<NonNullable<EuiSwitchProps['labelProps']>, 'css'>;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
  'data-test-subj'?: string;
}

interface AppMenuPrimaryActionBase extends AppMenuItemBase {
  /**
   * Width of the popover in pixels. Used when `items` or `splitButtonProps.items` is provided.
   */
  popoverWidth?: number;
  /**
   * A unique identifier for the popover, used for testing purposes. Maps to `data-test-subj` attribute.
   */
  popoverTestId?: string;
  /**
   * Subset of SplitButtonWithNotificationProps.
   */
  splitButtonProps?: AppMenuSplitButtonProps;
}

type AppMenuPrimaryActionButton = AppMenuPrimaryActionBase & {
  href?: string;
  target?: string;
  run: AppMenuRunAction;
  items?: never;
};

type AppMenuPrimaryActionLink = AppMenuPrimaryActionBase & {
  href: string;
  target?: string;
  run?: AppMenuRunAction;
  items?: never;
};

type AppMenuPrimaryActionPopover = AppMenuPrimaryActionBase & {
  href?: never;
  target?: never;
  run?: never;
  items: AppMenuPopoverItem[];
};

/**
 * Primary action button type. Can be a simple button, a button with a popover, or a split button.
 *
 * - Simple button: provide `run` to execute an action on click.
 * - Button with popover: provide `items` to open a popover menu on click.
 * - Split button: provide `run` together with `splitButtonProps` to combine a primary action
 *   with a secondary dropdown.
 */
export type AppMenuPrimaryActionItem =
  | AppMenuPrimaryActionButton
  | AppMenuPrimaryActionLink
  | AppMenuPrimaryActionPopover;

/**
 * Configuration object for the AppMenu component.
 * The maximum number of items that can be visible at once before overflowing into the "More"
 * popover is determined by the APP_MENU_ITEM_LIMIT constant - currently 5 but it will
 * be reduced to 3 in a future release.
 */
export interface AppMenuConfig {
  /**
   * List of menu items to display in the app menu.

   */
  items?: AppMenuItemType[];
  /**
   * Primary action button to display in the app menu.
   * Can be a simple button, a button with a popover, or a split button.
   */
  primaryActionItem?: AppMenuPrimaryActionItem;
  /**
   * App menu switch. Only one switch is available per app menu
   * and it is rendered to the left of the menu items.
   */
  switch?: AppMenuSwitch;
  /**
   * Displays history buttons to the left of the menu items.
   */
  historyConfig?: {
    undo?: {
      onClick: () => void;
      disabled?: boolean;
    };
    redo?: {
      onClick: () => void;
      disabled?: boolean;
    };
  };
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

/** Where the menu reads its responsive breakpoint from. */
export type AppMenuBreakpointSource = 'application' | 'viewport';

interface AppMenuComponentProps {
  config?: AppMenuConfig;
  visible?: boolean;
  breakpointSource?: AppMenuBreakpointSource;
  /** Static items that always appear at the end of the overflow menu. */
  staticItems?: AppMenuStaticItem[];
}

/** Props accepted by `AppMenuLoading`. */
export interface AppMenuLoadingProps {
  /**
   * App menu button placeholders (secondary actions before the primary, overflow after it).
   * Defaults to 1. Clamped to `APP_MENU_ITEM_LIMIT`.
   */
  buttonCount?: number;
  /** Primary-action rectangle. Defaults to `true`. */
  hasPrimary?: boolean;
  breakpointSource?: AppMenuBreakpointSource;
}

interface AppMenuPopoverStateProps {
  isPopoverOpen: boolean;
  onPopoverToggle: () => void;
  onPopoverClose: () => void;
}

type AppMenuItemProps = AppMenuItemType & AppMenuPopoverStateProps;

type AppMenuActionButtonProps = AppMenuPrimaryActionItem &
  AppMenuPopoverStateProps & {
    onCloseOverflowButton?: () => void;
    fullWidth?: boolean;
  };

interface AppMenuOverflowButtonProps extends AppMenuPopoverStateProps {
  items: AppMenuItemType[];
  staticItems?: AppMenuItemType[];
  primaryActionItem?: AppMenuPrimaryActionItem;
  switchConfig?: AppMenuSwitch;
}

interface AppMenuPopoverProps {
  tooltipContent?: string | (() => string | undefined);
  tooltipTitle?: string | (() => string | undefined);
  anchorElement: React.ReactElement;
  anchorDomElement?: HTMLElement;
  items: AppMenuPopoverItem[];
  staticItems?: AppMenuItemType[];
  isOpen: boolean;
  popoverWidth?: number;
  primaryActionItem?: AppMenuPrimaryActionItem;
  switchConfig?: AppMenuSwitch;
  popoverTestId?: string;
  anchorPosition?: PopoverAnchorPosition;
  repositionToCrossAxis?: boolean;
  onClose: () => void;
  onCloseOverflowButton?: () => void;
}

interface AppMenuPopoverActionButtonsProps {
  primaryActionItem?: AppMenuPrimaryActionItem;
  onCloseOverflowButton?: () => void;
}

export declare function AppMenuComponent(props: AppMenuComponentProps): React.JSX.Element | null;
export declare function AppMenuLoading(props: AppMenuLoadingProps): React.ReactElement | null;
export declare function AppMenuItem(props: AppMenuItemProps): React.JSX.Element;
export declare function AppMenuActionButton(props: AppMenuActionButtonProps): React.JSX.Element;
export declare function AppMenuOverflowButton(
  props: AppMenuOverflowButtonProps
): React.JSX.Element | null;
export declare function AppMenuPopover(props: AppMenuPopoverProps): React.JSX.Element | null;
export declare function AppMenuPopoverActionButtons(
  props: AppMenuPopoverActionButtonsProps
): React.JSX.Element | null;

// ---------------------------------------------------------------------------
// Constants and test subjects
// ---------------------------------------------------------------------------

export declare const APP_MENU_ITEM_LIMIT: 3;
export declare const APP_MENU_EBT_ELEMENT: 'appMenu';
export declare const APP_MENU_EBT_OPEN_MORE_ACTION: 'openMoreMenu';

export declare const APP_MENU_TEST_SUBJECTS: {
  readonly root: 'app-menu';
  readonly loading: 'app-menu-loading';
  readonly overflowButton: 'app-menu-overflow-button';
  readonly popover: 'app-menu-popover';
  readonly switch: 'app-menu-switch';
  readonly popoverActionButtonsContainer: 'app-menu-popover-action-buttons-container';
  readonly notificationIndicator: 'split-button-notification-indicator';
};
export declare function getAppMenuItemTestSubj(id: string): string;
export declare function getAppMenuActionButtonTestSubj(id: string): string;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export declare function getDisplayedItemsAllowedAmount(
  config: AppMenuConfig,
  hasStaticItems?: boolean
): number;
export declare function getShouldOverflow(params: {
  config: AppMenuConfig;
  displayedItemsAllowedAmount: number;
}): boolean;
export declare function isDisabled(disableButton: AppMenuItemCommon['disableButton']): boolean;
export declare function getTooltip(params: {
  tooltipContent?: AppMenuItemCommon['tooltipContent'];
  tooltipTitle?: AppMenuItemCommon['tooltipTitle'];
}): { title: string | undefined; content: string | undefined };
export declare function getAppMenuEbtDomProps(ebt?: AppMenuEbtAttrs):
  | {
      'data-ebt-action': string;
      'data-ebt-element': string;
      'data-ebt-detail'?: string;
    }
  | undefined;
export declare function mapAppMenuItemToPanelItem(
  item: AppMenuPopoverItem,
  childPanelId?: number,
  onClose?: () => void,
  onCloseOverflowButton?: () => void,
  anchorDomElement?: HTMLElement
): EuiContextMenuPanelItemDescriptor;
export declare function getAppMenuItems(params: {
  config?: AppMenuConfig;
  hasStaticItems?: boolean;
}): {
  displayedItems: AppMenuItemType[];
  overflowItems: AppMenuItemType[];
  shouldOverflow: boolean;
};
export declare function getPopoverPanels(params: {
  items: AppMenuPopoverItem[];
  staticItems?: AppMenuPopoverItem[];
  primaryActionItem?: AppMenuPrimaryActionItem;
  switchConfig?: AppMenuSwitch;
  startPanelId?: number;
  rootPanelWidth?: number;
  rootPopoverTestId?: string;
  onClose?: () => void;
  onCloseOverflowButton?: () => void;
  anchorDomElement?: HTMLElement;
}): EuiContextMenuPanelDescriptor[];
export declare function getPopoverActionItems(params: {
  primaryActionItem?: AppMenuPrimaryActionItem;
  onCloseOverflowButton?: () => void;
}): EuiContextMenuPanelItemDescriptor[];
export declare function getIsSelectedColor(params: {
  color: EuiButtonColor;
  euiTheme: EuiThemeComputed;
  isFilled: boolean;
}):
  | string
  | EuiThemeComputed['components']['buttons'][keyof EuiThemeComputed['components']['buttons']];
export declare function hasNonGlobalStaticItems(staticItems?: Array<{ global?: boolean }>): boolean;
