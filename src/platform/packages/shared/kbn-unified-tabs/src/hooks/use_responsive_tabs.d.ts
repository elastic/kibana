import React from 'react';
import type { TabItem } from '../types';
export interface UseResponsiveTabsProps {
    items: TabItem[];
    hasReachedMaxItemsCount: boolean;
    tabsContainerWithPlusElement: Element | null;
    tabsContainerElement: Element | null;
}
export declare const useResponsiveTabs: ({ items, hasReachedMaxItemsCount, tabsContainerWithPlusElement, tabsContainerElement, }: UseResponsiveTabsProps) => {
    tabsSizeConfig: import("../types").TabsSizeConfig;
    scrollLeftButton: React.JSX.Element | null;
    scrollRightButton: React.JSX.Element | null;
    tabsContainerCss: import("@emotion/react").SerializedStyles;
};
