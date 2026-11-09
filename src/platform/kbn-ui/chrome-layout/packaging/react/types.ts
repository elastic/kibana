/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Standalone type definitions for the `@kbn/ui-chrome-layout` external package.
 *
 * Types are defined inline (not re-exported) so that declaration generation
 * does not pull in the full Kibana dependency graph. Build-time validation
 * in `type_validation.ts` ensures these stay in sync with the source types.
 *
 * @see {@link ./type_validation.ts} for the compatibility check.
 */

import type * as React from 'react';
import type { EuiBreakpointSize, UseEuiTheme } from '@elastic/eui';

type ReactNode = string | number | boolean | null | undefined | React.ReactElement;

/** Visual appearance of the application shell. */
export type LayoutAppearance = 'plain' | 'framed';

/** Pixel dimensions for each layout area. */
export interface LayoutDimensions {
  bannerHeight: number;
  footerHeight: number;
  headerHeight: number;
  navigationWidth: number;
  sidebarWidth: number;
  applicationTopBarHeight: number;
  applicationBottomBarHeight: number;
  applicationMarginTop: number;
  applicationMarginBottom: number;
  applicationMarginRight: number;
}

/** Full layout state including derived presence flags. */
export interface LayoutState extends LayoutDimensions {
  hasBanner: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasHeader: boolean;
  hasNavigation: boolean;
  hasApplicationTopBar: boolean;
  hasApplicationBottomBar: boolean;
}

type SlotProps = LayoutState;
type Slot = ReactNode | ((props: SlotProps) => ReactNode);

/** Configuration provided to ChromeLayoutConfigProvider. */
export interface ChromeLayoutConfig {
  bannerHeight?: number;
  headerHeight?: number;
  footerHeight?: number;
  navigationWidth?: number;
  sidebarWidth?: number;
  applicationTopBarHeight?: number;
  applicationBottomBarHeight?: number;
  applicationMarginTop?: number;
  applicationMarginBottom?: number;
  applicationMarginRight?: number;
  appearance?: LayoutAppearance;
}

/** Props for the ChromeLayoutConfigProvider component. */
export interface ChromeLayoutConfigProviderProps {
  value: ChromeLayoutConfig;
  children: ReactNode;
}

/** Named slots accepted by ChromeLayout. */
export interface ChromeLayoutSlots {
  header?: Slot | null;
  navigation?: Slot | null;
  banner?: Slot | null;
  footer?: Slot | null;
  sidebar?: Slot | null;
  applicationTopBar?: Slot | null;
  applicationBottomBar?: Slot | null;
}

/** Props accepted by the ChromeLayout component. */
export interface ChromeLayoutProps extends ChromeLayoutSlots {
  children: Slot;
}

/** Props accepted by GridLayoutGlobalStyles. */
export interface GridLayoutGlobalStylesProps {
  appearance?: LayoutAppearance;
}

export declare function ChromeLayout(props: ChromeLayoutProps): React.ReactNode;
export declare function ChromeLayoutConfigProvider(
  props: ChromeLayoutConfigProviderProps
): React.ReactNode;
export declare function useLayoutUpdate(): (updates: Partial<ChromeLayoutConfig>) => void;
export declare function useLayoutConfig(): ChromeLayoutConfig;
export declare function LayoutDebugOverlay(): React.ReactNode;
export declare function GridLayoutGlobalStyles(props: GridLayoutGlobalStylesProps): React.ReactNode;

export type LayoutComponent =
  | 'banner'
  | 'header'
  | 'footer'
  | 'navigation'
  | 'sidebar'
  | 'application';
export type ApplicationComponent = 'topBar' | 'bottomBar' | 'content';
export type LayoutProperty =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'height'
  | 'width'
  | 'marginBottom'
  | 'marginRight'
  | 'marginTop';
export type LayoutVarName = `${LayoutComponent}.${LayoutProperty}`;
export type ApplicationVarName = `application.${ApplicationComponent}.${LayoutProperty}`;
export type CSSVarName = LayoutVarName | ApplicationVarName;

export declare function layoutVar(name: CSSVarName, fallback?: string): string;
export declare function layoutVarName(name: CSSVarName): string;

export declare const layoutLevels: {
  content: number;
  header: number;
  footer: number;
  navigation: number;
  sidebar: number;
  banner: number;
  applicationTopBar: number;
  applicationBottomBar: number;
  debug: number;
};

export declare const APP_MAIN_SCROLL_CONTAINER_ID: string;
export declare const FLYOUT_SELECTOR: string;
export declare const MAIN_CONTENT_SELECTORS: string[];
export declare const SIDE_PANEL_CONTENT_GAP: number;
export declare const euiIncludeSelectorInFocusTrap: {
  prop: { 'data-eui-includes-in-flyout-focus-trap': boolean };
  selector: string;
};

export type ScrollContainer = HTMLElement;

export declare function getScrollContainer(): ScrollContainer;
export declare function getViewportHeight(container?: ScrollContainer): number;
export declare function getViewportBoundaries(container?: ScrollContainer): {
  top: number;
  bottom: number;
};
export declare function getScrollPosition(container?: ScrollContainer): number;
export declare function getScrollDimensions(container?: ScrollContainer): {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
};
export declare function scrollTo(
  opts: { top: number; behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollToTop(
  opts?: { behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollToBottom(
  opts?: { behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function scrollBy(
  opts: { top: number; behavior?: ScrollBehavior },
  container?: ScrollContainer
): void;
export declare function isAtBottomOfPage(container?: ScrollContainer): boolean;

export interface HighContrastSeparatorOptions {
  side?: 'top' | 'bottom';
  width?: string;
  left?: string;
  right?: string;
}

export declare function getHighContrastBorder(euiThemeContext: UseEuiTheme): string;
export declare function getHighContrastSeparator(
  euiThemeContext: UseEuiTheme,
  options?: HighContrastSeparatorOptions
): string;

export declare function useCurrentChromeApplicationBreakpoint(): EuiBreakpointSize | undefined;
export declare function useIsWithinChromeApplicationBreakpoints(
  breakpoints: EuiBreakpointSize[],
  isResponsive?: boolean
): boolean;
