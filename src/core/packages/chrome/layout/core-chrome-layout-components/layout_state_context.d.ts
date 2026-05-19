import type { ReactNode } from 'react';
import React from 'react';
import type { ChromeLayoutSlots, LayoutState } from './layout.types';
export interface LayoutStateProps extends ChromeLayoutSlots {
    children: ReactNode;
}
/**
 * The layout state provider component.
 * Wires up the LayoutConfig to the layout state.
 *
 * @param props - Props for the LayoutStateProvider component.
 * @returns The rendered LayoutStateProvider component.
 */
export declare const LayoutStateProvider: ({ children, ...props }: LayoutStateProps) => React.JSX.Element;
export declare const useLayoutState: () => LayoutState;
