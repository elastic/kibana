import React from 'react';
import { type TabsBarProps } from '../tabs_bar';
import type { TabItem, TabsServices, TabPreviewData, TabsEBTEvent, RecentlyClosedTabItem, TabMenuItem } from '../../types';
export interface TabbedContentProps extends Pick<TabsBarProps, 'unsavedItemIds' | 'maxItemsCount' | 'onClearRecentlyClosed' | 'disableCloseButton' | 'disableInlineLabelEditing' | 'disableDragAndDrop' | 'disableTabsBarMenu'> {
    items: TabItem[];
    selectedItemId?: string;
    recentlyClosedItems: RecentlyClosedTabItem[];
    'data-test-subj'?: string;
    services: TabsServices;
    hideTabsBar?: boolean;
    renderContent?: (selectedItem: TabItem) => React.ReactNode;
    /**
     * Optional wrapper for the tabs bar. Receives the tabs bar node
     * and returns a node to render in its place.
     * When omitted, the default tabs bar is rendered as-is.
     */
    wrapTabsBar?: (tabsBar: React.ReactNode) => React.ReactNode;
    createItem: () => TabItem;
    customNewTabButton?: React.ReactElement;
    onChanged: (state: TabbedContentState) => void;
    getPreviewData?: (item: TabItem) => TabPreviewData;
    onEBTEvent: (event: TabsEBTEvent) => void;
    tabContentIdOverride?: string;
    appendRight?: React.ReactNode;
    /** Optional function to provide menu items placed after rename/duplicate */
    getTopTabMenuItems?: (item: TabItem) => TabMenuItem[];
    /** Optional function to provide additional menu items placed at the end of the menu */
    getAdditionalTabMenuItems?: (item: TabItem) => TabMenuItem[];
    /** Optional callback invoked when tabs are dropped due to the max tab limit */
    onTabLimitReached?: (droppedCount: number) => void;
}
export interface TabbedContentState {
    items: TabItem[];
    selectedItem: TabItem | null;
}
export declare const TabbedContent: React.FC<TabbedContentProps>;
