import type { ReactNode } from 'react';
import React from 'react';
export interface LayoutBannerProps {
    children: ReactNode;
}
/**
 * The banner slot wrapper
 *
 * @param props - Props for the LayoutBanner component.
 * @returns The rendered LayoutBanner component.
 */
export declare const LayoutBanner: ({ children }: LayoutBannerProps) => React.JSX.Element;
