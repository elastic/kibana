import type { TabItem, TabsSizeConfig } from '../types';
export declare const PLUS_BUTTON_SPACE: number;
interface GetTabsSizeConfigProps {
    items: TabItem[];
    containerWidth: number | undefined;
    hasReachedMaxItemsCount?: boolean;
    horizontalGap?: number;
}
export declare const calculateResponsiveTabs: ({ items, containerWidth, hasReachedMaxItemsCount, horizontalGap, }: GetTabsSizeConfigProps) => TabsSizeConfig;
export {};
