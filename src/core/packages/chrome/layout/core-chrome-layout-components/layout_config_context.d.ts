import type { ReactNode } from 'react';
import React from 'react';
import type { ChromeStyle } from './layout.types';
import type { LayoutDimensions } from './layout.types';
/**
 * Configuration for the layout.
 * @public
 */
export type LayoutConfig = Pick<Partial<LayoutDimensions>, 'bannerHeight' | 'headerHeight' | 'footerHeight' | 'navigationWidth' | 'sidebarWidth' | 'applicationTopBarHeight' | 'applicationBottomBarHeight' | 'applicationMarginTop' | 'applicationMarginBottom' | 'applicationMarginRight'> & {
    chromeStyle?: ChromeStyle;
};
/** Update function type for layout config */
type LayoutUpdateFn = (updates: Partial<LayoutConfig>) => void;
/**
 * Props for the LayoutConfigProvider component.
 * @public
 */
export interface LayoutConfigProviderProps {
    value: LayoutConfig;
    children: ReactNode;
}
/**
 * Provider of the layout config
 * @public
 */
export declare const LayoutConfigProvider: ({ value: initialValue, children, }: LayoutConfigProviderProps) => React.JSX.Element;
/**
 * Hook to access the layout configuration.
 * @internal
 * @returns The current layout configuration
 * @throws Error if used outside of a LayoutConfigProvider
 */
export declare function useLayoutConfig(): LayoutConfig;
/**
 * Hook to get the layout update function. Does not cause re-renders when config changes.
 * @public
 * @returns a function to update the layout config
 * @throws Error if used outside of a LayoutConfigProvider
 */
export declare function useLayoutUpdate(): LayoutUpdateFn;
export {};
