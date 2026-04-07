/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { IconType } from '@elastic/eui';

export type BadgeType = 'beta' | 'techPreview' | 'new';

/**
 * A navigation item within a secondary/nested menu.
 * Secondary items appear when a top-level navigation item with sections is clicked or hovered.
 */
export interface SecondaryMenuItem {
  /**
   * The URL for the menu item link.
   */
  href: string;
  /**
   * The unique identifier of the menu item.
   */
  id: string;
  /**
   * The label to display for the menu item.
   */
  label: string;
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
  /**
   * (optional) The type of badge shown next to the item (e.g. `beta`, `techPreview`, `new`).
   */
  badgeType?: BadgeType;
  /**
   * (optional) Whether the link opens in a new tab.
   */
  isExternal?: boolean;
}

/**
 * A section grouping within a secondary menu.
 * Sections help organize related secondary menu items with optional headers.
 */
export interface SecondaryMenuSection {
  /**
   * The unique identifier of the secondary menu section.
   */
  id: string;
  /**
   * The items contained in the secondary menu section.
   */
  items: SecondaryMenuItem[];
  /**
   * (optional) The label to display for the secondary menu section.
   */
  label?: string;
}

/**
 * A primary navigation menu item that appears in the main navigation sidebar.
 * Primary items must always be navigable links.
 */
export interface MenuItem {
  /**
   * The URL for the menu item link.
   */
  href: string;
  /**
   * The icon to display for the menu item.
   */
  iconType: IconType;
  /**
   * The unique identifier of the menu item.
   */
  id: string;
  /**
   * The label to display for the menu item.
   */
  label: string;
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
  /**
   * (optional) The type of badge shown next to the item (e.g. `beta`, `techPreview`, `new`).
   */
  badgeType?: BadgeType;
  /**
   * (optional) The secondary menu sections belonging to the menu item.
   */
  sections?: SecondaryMenuSection[];
}

/**
 * A chrome tool control (search, help, profile, etc.) — not a navigation destination.
 * Tool items can perform an action via `onClick` or expose submenu content via `sections`.
 *
 * At least one of `iconType` or `renderContent` must be provided.
 * When both are present, `renderContent` takes precedence for the trigger visual.
 *
 * When `renderPopover` is present, it takes precedence over `sections` for the
 * popover body content. They are not combined.
 */
export interface ToolItem {
  id: string;
  label: string;
  iconType?: IconType;
  renderContent?: (state: { isCollapsed: boolean }) => ReactNode;
  renderPopover?: (closePopover: () => void) => ReactNode;
  onClick?: () => void;
  sections?: SecondaryMenuSection[];
  popoverWidth?: number | string;
  badgeType?: BadgeType;
  'data-test-subj'?: string;
}

/**
 * Optional groupings of tool controls for the sidenav header and footer toolbars.
 */
export interface ToolSlots {
  headerTools?: ToolItem[];
  footerTools?: ToolItem[];
}

/**
 * Navigable sidenav content: primary rail and footer links.
 */
export interface NavigationStructure {
  /**
   * The items to be displayed in the navigation footer (navigable links).
   */
  footerItems: MenuItem[];
  /**
   * The primary navigation items displayed in the navigation main menu.
   */
  primaryItems: MenuItem[];
}

export interface MenuCalculations {
  /**
   * The total available height (in pixels) for the menu rendering.
   */
  availableHeight: number;
  /**
   * The gap (in pixels) between the menu items.
   */
  itemGap: number;
  /**
   * The maximum number of menu items that can be displayed in the navigation menu.
   */
  maxVisibleItems: number;
}

export interface SideNavLogo {
  /**
   * The route ID of the logo, used for the active state.
   */
  id: string;
  /**
   * The href of the logo link, typically the home page.
   */
  href: string;
  /**
   * The label for the logo, typically the product name.
   */
  label: string;
  /**
   * When `true`, the label is not rendered under the icon while the navigation is expanded.
   * The logo link still uses `label` for `aria-label` and for the collapsed-mode tooltip.
   */
  hideLabel?: boolean;
  /**
   * The logo type, e.g. `appObservability`, `appSecurity`, etc.
   */
  iconType: string;
  /**
   * (optional) Color of the logo icon. `'default'` renders the icon in its brand colors;
   * `'text'` renders it monochromatically using the current text color.
   */
  iconColor?: 'default' | 'text';
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
}
