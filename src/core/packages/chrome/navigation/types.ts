/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

/**
 * Badge types that can be displayed next to navigation items.
 * - 'beta': Blue badge for features in beta testing
 * - 'techPreview': Purple badge for technical preview features
 */
export type BadgeType = 'beta' | 'techPreview';

/**
 * A navigation item within a secondary/nested menu.
 * Secondary items appear when a primary menu item with sections is clicked or hovered.
 */
export interface SecondaryMenuItem {
  /** Optional test selector for automated testing */
  'data-test-subj'?: string;
  /** Optional badge to display next to the label */
  badgeType?: BadgeType;
  /** URL or hash for navigation */
  href: string;
  /** Unique identifier for this item */
  id: string;
  /** If true, opens link in new tab with external icon */
  isExternal?: boolean;
  /** Display text for the menu item */
  label: string;
}

/**
 * A section grouping within a secondary menu.
 * Sections help organize related secondary menu items with optional headers.
 */
export interface SecondaryMenuSection {
  /** Unique identifier for this section */
  id: string;
  /** Array of menu items in this section */
  items: SecondaryMenuItem[];
  /** Optional section header label (omit for unlabeled sections) */
  label?: string;
}

/**
 * A primary navigation menu item that appears in the main navigation sidebar.
 * Can optionally contain nested secondary menu sections.
 */
export interface MenuItem {
  /** Optional test selector for automated testing */
  'data-test-subj'?: string;
  /** Optional badge to display next to the label */
  badgeType?: BadgeType;
  /** URL or hash for navigation */
  href: string;
  /** EUI icon name or component - see https://eui.elastic.co/#/display/icons */
  iconType: IconType;
  /** Unique identifier for this item */
  id: string;
  /** Display text for the menu item */
  label: string;
  /** Optional array of secondary menu sections for nested navigation */
  sections?: SecondaryMenuSection[];
}

/**
 * The complete navigation structure containing primary and footer menu items.
 * This is the main data structure passed to the Navigation component.
 */
export interface NavigationStructure {
  /** Array of items displayed in the footer area of the navigation */
  footerItems: MenuItem[];
  /** Array of items displayed in the primary/main area of the navigation */
  primaryItems: MenuItem[];
}

export interface MenuCalculations {
  availableHeight: number;
  itemGap: number;
  maxVisibleItems: number;
}

export interface SideNavLogo {
  /**
   * The route ID for the logo, used for the active state.
   */
  id: string;
  /**
   * The href for the logo link, typically the home page.
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
   * Optional data-test-subj attribute
   */
  'data-test-subj'?: string;
}
