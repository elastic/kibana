import React from 'react';
import type { RecentlyClosedTabItem, TabPreviewData } from '../../types';
import type { TabItem } from '../../types';
export declare const testSubj: {
    tabsBarMenu: string;
    tabsBarMenuPanel: string;
    tabsBarMenuButton: string;
    openedTabsContextMenu: string;
    clearRecentlyClosed: string;
    recentlyClosedContextMenu: string;
    restoreAllTabs: string;
    openedTab: (id: string) => string;
    recentlyClosedTab: (id: string) => string;
    recentlyClosedGroup: (closedAt: number) => string;
    recentlyClosedGroupTab: (id: string) => string;
};
export interface TabsBarMenuProps {
    items: TabItem[];
    selectedItem: TabItem | null;
    recentlyClosedItems: RecentlyClosedTabItem[];
    hasReachedMaxItemsCount: boolean;
    getPreviewData?: (item: TabItem) => TabPreviewData;
    onSelect: (item: TabItem) => Promise<void>;
    onSelectRecentlyClosed: (item: RecentlyClosedTabItem) => Promise<void>;
    onRestoreRecentlyClosedGroup: (items: RecentlyClosedTabItem[]) => Promise<void>;
    onClearRecentlyClosed: () => void;
}
export declare const TabsBarMenu: React.FC<TabsBarMenuProps>;
