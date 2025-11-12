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
 *    `tsc types.ts --declaration --emitDeclarationOnly --outFile --skipLibCheck`
 *    This compiles in < 1 second and produces clean, minimal output (3.2 KB).
 *
 * 4. IMPORTANT: We cannot use any imports in this file when using --outFile, as TypeScript will
 *    wrap the output in a `declare module` block, making it unusable. All types must be inlined.
 *
 * MAINTENANCE:
 * - When public API types change, update both the source types and this file in the same commit.
 * - Type checking in the wrapper (index.tsx) will catch mismatches during webpack build.
 * - Public API types rarely change, so duplication is minimal maintenance burden.
 */

// Re-define all types inline to avoid importing from source files
type ReactNode = string | number | boolean | null | undefined | React.ReactElement;

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
  /** EUI icon name (e.g., 'dashboardApp', 'graphApp', 'gear') - see https://eui.elastic.co/#/display/icons */
  iconType: string; // IconType from @elastic/eui
  /** Unique identifier for this item */
  id: string;
  /** Display text for the menu item */
  label: string;
  /** Optional array of secondary menu sections for nested navigation */
  sections?: SecondaryMenuSection[];
}

/**
 * The complete navigation structure containing primary and footer menu items.
 * This is the main data structure passed to the OneNavigation component.
 */
export interface NavigationStructure {
  /** Array of items displayed in the footer area of the navigation */
  footerItems: MenuItem[];
  /** Array of items displayed in the primary/main area of the navigation */
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

// Component declarations (will be compiled to function declarations in .d.ts)
export declare function OneNavigation(props: OneNavigationProps): React.ReactNode;
