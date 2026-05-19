import type { ReactNode } from 'react';
import React from 'react';
export interface LayoutSidebarProps {
    children: ReactNode;
}
/**
 * The sidebar slot wrapper
 *
 * @param props - Props for the LayoutSidebar component.
 * @returns The rendered LayoutSidebar component.
 */
export declare const LayoutSidebar: ({ children }: LayoutSidebarProps) => React.JSX.Element;
