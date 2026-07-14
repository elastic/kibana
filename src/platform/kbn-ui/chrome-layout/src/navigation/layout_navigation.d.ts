import React, { type ReactNode } from 'react';
export interface LayoutNavigationProps {
    children: ReactNode;
}
/**
 * The navigation slot wrapper
 *
 * @param props - Props for the LayoutNavigation component.
 * @returns The rendered LayoutNavigation component.
 */
export declare const LayoutNavigation: ({ children }: LayoutNavigationProps) => React.JSX.Element;
