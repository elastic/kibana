/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

export type BadgeType = 'beta' | 'techPreview' | 'new';

/**
 * A nested side panel opened from a side panel header action.
 */
export interface PanelNestedPanel {
  /**
   * The unique identifier of the nested panel.
   */
  id: string;
  /**
   * The title to display in the nested panel header.
   */
  title: string;
}

/**
 * An icon button rendered in a side panel header next to the panel title.
 */
export interface PanelHeaderAction {
  /**
   * Accessible label for the header action button.
   */
  'aria-label': string;
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
  /**
   * The EUI icon to display on the button.
   */
  iconType: IconType;
  /**
   * The unique identifier of the header action.
   */
  id: string;
  /**
   * (optional) Click handler for the header action button.
   */
  onClick?: () => void;
  /**
   * (optional) When set, clicking the header action opens the nested side panel with this id.
   */
  opensNestedPanel?: string;
  /**
   * (optional) When set, clicking the action opens a registered item action menu popover.
   */
  opensItemActionMenu?: string;
  /**
   * (optional) Context passed to the registered item action menu renderer.
   */
  itemActionMenuContext?: Record<string, string>;
}

/**
 * A text button rendered at the bottom of a side panel for panel opener nodes.
 */
export interface PanelFooterAction {
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
  /**
   * The URL for the footer action link.
   */
  href: string;
  /**
   * The EUI icon to display on the button.
   */
  iconType: IconType;
  /**
   * The unique identifier of the footer action.
   */
  id: string;
  /**
   * The label to display for the footer action.
   */
  label: string;
  /**
   * (optional) Click handler for the footer action button.
   */
  onClick?: () => void;
}

/**
 * A navigation item within a secondary/nested menu.
 * Secondary items appear when a primary menu item with sections is clicked or hovered.
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
  /**
   * (optional) Icon buttons rendered on the trailing edge of this menu item row.
   */
  itemActions?: PanelHeaderAction[];
}

/**
 * Placeholder content shown when a secondary menu section has no items.
 */
export interface SecondaryMenuSectionEmptyState {
  iconType: IconType;
  message: string;
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
  /**
   * (optional) Animate list item reordering within this section.
   */
  animateItemReorder?: boolean;
  /**
   * (optional) Placeholder shown when the section has no items.
   */
  emptyState?: SecondaryMenuSectionEmptyState;
}

/**
 * A primary navigation menu item that appears in the main navigation sidebar.
 * Can optionally contain nested secondary menu sections.
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
   * (optional) Icon buttons rendered in the side panel header next to the panel title.
   */
  panelHeaderActions?: PanelHeaderAction[];
  /**
   * (optional) Nested side panels opened from panel header actions.
   */
  panelNestedPanels?: PanelNestedPanel[];
  /**
   * (optional) Text buttons rendered at the bottom of the side panel.
   */
  panelFooterActions?: PanelFooterAction[];
  /**
   * (optional) The secondary menu sections belonging to the menu item.
   */
  sections?: SecondaryMenuSection[];
}

/**
 * The complete navigation structure containing primary, overflow, and footer menu items.
 * This is the main data structure passed to the Navigation component.
 */
export interface NavigationStructure {
  /**
   * The items to be displayed in the navigation footer.
   */
  footerItems: MenuItem[];
  /**
   * Items that are always placed in the overflow ("More") menu.
   */
  overflowItems?: MenuItem[];
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
   * The logo type, e.g. `appObservability`, `appSecurity`, etc.
   */
  iconType: string;
  /**
   * (optional) `data-test-subj` attribute for testing and tracking purposes.
   */
  'data-test-subj'?: string;
}
