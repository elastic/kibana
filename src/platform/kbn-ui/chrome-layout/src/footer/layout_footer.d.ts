import type { ReactNode } from 'react';
import React from 'react';
export interface LayoutFooterProps {
    children: ReactNode;
}
/**
 * The footer slot wrapper
 *
 * @param props - Props for the LayoutFooter component.
 * @returns The rendered LayoutFooter component.
 */
export declare const LayoutFooter: ({ children }: LayoutFooterProps) => React.JSX.Element;
