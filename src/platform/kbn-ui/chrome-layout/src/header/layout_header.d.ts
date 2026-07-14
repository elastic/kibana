import React, { type ReactNode } from 'react';
export interface LayoutHeaderProps {
    children: ReactNode;
}
/**
 * The header slot wrapper
 *
 * @param props - Props for the LayoutHeader component.
 * @returns The rendered LayoutHeader component.
 */
export declare const LayoutHeader: ({ children }: LayoutHeaderProps) => React.JSX.Element;
