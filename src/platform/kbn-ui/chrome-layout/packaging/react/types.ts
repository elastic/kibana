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
export type KbnChromeStyle = 'classic' | 'project';

/** Pixel dimensions for each layout area. */
export interface KbnChromeLayoutDimensions {
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
export interface KbnChromeLayoutState extends KbnChromeLayoutDimensions {
  hasBanner: boolean;
  hasFooter: boolean;
  hasSidebar: boolean;
  hasHeader: boolean;
  hasNavigation: boolean;
  hasApplicationTopBar: boolean;
  hasApplicationBottomBar: boolean;
}

type SlotProps = KbnChromeLayoutState;
type Slot = ReactNode | ((props: SlotProps) => ReactNode);

/** Configuration provided to KbnChromeLayoutConfigProvider. */
export interface KbnChromeLayoutConfig {
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
  chromeStyle?: KbnChromeStyle;
}

/** Props for the KbnChromeLayoutConfigProvider component. */
export interface KbnChromeLayoutConfigProviderProps {
  value: KbnChromeLayoutConfig;
  children: ReactNode;
}

/** Named slots accepted by KbnChromeLayout. */
export interface KbnChromeLayoutSlots {
  header?: Slot | null;
  navigation?: Slot | null;
  banner?: Slot | null;
  footer?: Slot | null;
  sidebar?: Slot | null;
  applicationTopBar?: Slot | null;
  applicationBottomBar?: Slot | null;
}

/** Props accepted by the KbnChromeLayout component. */
export interface KbnChromeLayoutProps extends KbnChromeLayoutSlots {
  children: Slot;
}

/** Props accepted by KbnGridLayoutGlobalStyles. */
export interface KbnGridLayoutGlobalStylesProps {
  chromeStyle?: KbnChromeStyle;
}

export declare function KbnChromeLayout(props: KbnChromeLayoutProps): React.ReactNode;
export declare function KbnChromeLayoutConfigProvider(
  props: KbnChromeLayoutConfigProviderProps
): React.ReactNode;
export declare function useKbnChromeLayoutUpdate(): (
  updates: Partial<KbnChromeLayoutConfig>
) => void;
export declare function useKbnChromeLayoutConfig(): KbnChromeLayoutConfig;
export declare function KbnChromeLayoutDebugOverlay(): React.ReactNode;
export declare function KbnGridLayoutGlobalStyles(
  props: KbnGridLayoutGlobalStylesProps
): React.ReactNode;
export declare function KbnCommonGlobalAppStyles(): React.ReactNode;
