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
}
export interface TabbedContentState {
    items: TabItem[];
    selectedItem: TabItem | null;
}
export declare const TabbedContent: React.FC<TabbedContentProps>;
