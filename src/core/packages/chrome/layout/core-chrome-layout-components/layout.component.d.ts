import React from 'react';
import type { ChromeLayoutSlots, Slot } from './layout.types';
export interface ChromeLayoutComponentProps extends ChromeLayoutSlots {
    children: Slot;
}
/**
 * The chrome layout component that composes slots together.
 *
 * @param props - ChromeLayoutComponentProps
 * @returns The rendered ChromeLayoutComponent.
 */
export declare const ChromeLayoutComponent: ({ children, ...props }: ChromeLayoutComponentProps) => React.JSX.Element;
