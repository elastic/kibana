/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';

export type BadgeType = 'beta' | 'techPreview';

export interface SecondaryMenuItem {
  'data-test-subj'?: string;
  badgeType?: BadgeType;
  href: string;
  id: string;
  isExternal?: boolean;
  label: string;
}

export interface SecondaryMenuSection {
  id: string;
  items: SecondaryMenuItem[];
  label?: string;
}

export interface MenuItem {
  'data-test-subj'?: string;
  badgeType?: BadgeType;
  href: string;
  iconType: IconType;
  id: string;
  label: string;
  sections?: SecondaryMenuSection[];
}

export interface NavigationStructure {
  footerItems: MenuItem[];
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
