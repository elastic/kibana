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

type ReactNode = string | number | boolean | null | undefined | React.ReactElement;

/** Chrome style variants applied to the layout. */
export type ChromeStyle = 'classic' | 'project';

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
  agentMarginLeft: number;
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
  agentMarginLeft?: number;
  chromeStyle?: ChromeStyle;
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
  chromeStyle?: ChromeStyle;
}

export declare function ChromeLayout(props: ChromeLayoutProps): React.ReactNode;
export declare function ChromeLayoutConfigProvider(
  props: ChromeLayoutConfigProviderProps
): React.ReactNode;
export declare function useLayoutUpdate(): (updates: Partial<ChromeLayoutConfig>) => void;
export declare function useLayoutConfig(): ChromeLayoutConfig;
export declare function LayoutDebugOverlay(): React.ReactNode;
export declare function GridLayoutGlobalStyles(props: GridLayoutGlobalStylesProps): React.ReactNode;
export declare function CommonGlobalAppStyles(): React.ReactNode;
