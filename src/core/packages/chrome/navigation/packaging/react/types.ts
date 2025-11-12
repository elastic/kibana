/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for OneNavigation external package.
 *
 * WHY TYPES ARE DUPLICATED (not re-exported):
 *
 * This file defines all public API types inline rather than re-exporting them from source files.
 * This follows the pattern established by one-console and is necessary because:
 *
 * 1. Re-exporting types (e.g., `export type { NavigationProps } from '../../types'`) causes
 *    TypeScript to follow the import chain and attempt to compile all source files and their
 *    dependencies (@kbn/i18n, @elastic/eui, @emotion/react, etc.)
 *
 * 2. This would require complex TypeScript configuration (jsx, jsxImportSource, moduleResolution,
 *    path mappings, etc.) and significantly slower builds.
 *
 * 3. By defining types inline, we can use a simple build command:
 *    `tsc types.ts --declaration --emitDeclarationOnly --skipLibCheck`
 *    This compiles in < 1 second and produces clean, minimal output (3.2 KB).
 *
 * MAINTENANCE:
 * - When public API types change, update both the source types and this file in the same commit.
 * - Type checking in the wrapper (index.tsx) will catch mismatches during webpack build.
 * - Public API types rarely change, so duplication is minimal maintenance burden.
 */

import type { ReactNode } from 'react';

// Re-define all types inline to avoid importing from source files

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
  iconType: string; // IconType from @elastic/eui
  id: string;
  label: string;
  sections?: SecondaryMenuSection[];
}

export interface NavigationStructure {
  footerItems: MenuItem[];
  primaryItems: MenuItem[];
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

export interface NavigationProps {
  /**
   * The active path for the navigation, used for highlighting the current item.
   */
  activeItemId?: string;
  /**
   * Content to display inside the side panel footer.
   */
  sidePanelFooter?: ReactNode;
  /**
   * Whether the navigation is collapsed. This can be controlled by the parent component.
   */
  isCollapsed: boolean;
  /**
   * The navigation structure containing primary, secondary, and footer items.
   */
  items: NavigationStructure;
  /**
   * The logo object containing the route ID, href, label, and type.
   */
  logo: SideNavLogo;
  /**
   * Callback fired when a navigation item is clicked.
   */
  onItemClick?: (item: MenuItem | SecondaryMenuItem | SideNavLogo) => void;
  /**
   * Required by the grid layout to set the width of the navigation slot.
   */
  setWidth: (width: number) => void;
  /**
   * CSS selectors for the main content area (used for focus management).
   * Defaults to ['main', '[role="main"]', '#app-content'] if not provided.
   * These defaults match Kibana's MAIN_CONTENT_SELECTORS for backward compatibility.
   */
  mainContentSelectors?: string[];
  /**
   * ID of the main scroll container (used for skip links).
   * Defaults to 'app-content' if not provided.
   * This default matches Kibana's APP_MAIN_SCROLL_CONTAINER_ID for backward compatibility.
   */
  mainScrollContainerId?: string;
  /**
   * Optional data-test-subj attribute for testing purposes.
   */
  'data-test-subj'?: string;
}

// Alias for external package
export type OneNavigationProps = NavigationProps;
