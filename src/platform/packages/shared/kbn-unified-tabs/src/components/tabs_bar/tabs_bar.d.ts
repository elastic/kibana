import React from 'react';
import { type TabProps } from '../tab';
import type { TabItem, TabsServices, TabsEBTEvent, RecentlyClosedTabItem } from '../../types';
import { type TabsBarMenuProps } from '../tabs_bar_menu';
export type TabsBarProps = Pick<TabProps, 'getTabMenuItems' | 'getPreviewData' | 'onLabelEdited' | 'onSelect' | 'onClose' | 'tabContentId' | 'disableCloseButton' | 'disableInlineLabelEditing' | 'disableDragAndDrop'> & {
    items: TabItem[];
    selectedItem: TabItem | null;
    recentlyClosedItems: RecentlyClosedTabItem[];
    unsavedItemIds?: string[];
    maxItemsCount?: number;
    services: TabsServices;
    onAdd: () => Promise<void>;
    onSelectRecentlyClosed: TabsBarMenuProps['onSelectRecentlyClosed'];
    onRestoreRecentlyClosedGroup: TabsBarMenuProps['onRestoreRecentlyClosedGroup'];
    onReorder: (items: TabItem[], movedTabId: string) => void;
    onEBTEvent: (event: TabsEBTEvent) => void;
    onClearRecentlyClosed: TabsBarMenuProps['onClearRecentlyClosed'];
    customNewTabButton?: React.ReactElement;
    disableTabsBarMenu?: boolean;
};
export interface TabsBarApi {
    moveFocusToNextSelectedItem: (item: TabItem) => void;
}
export declare const TabsBar: React.ForwardRefExoticComponent<Pick<TabProps, "onSelect" | "onClose" | "getTabMenuItems" | "onLabelEdited" | "tabContentId" | "getPreviewData" | "disableCloseButton" | "disableInlineLabelEditing" | "disableDragAndDrop"> & {
    items: TabItem[];
    selectedItem: TabItem | null;
    recentlyClosedItems: RecentlyClosedTabItem[];
    unsavedItemIds?: string[];
    maxItemsCount?: number;
    services: TabsServices;
    onAdd: () => Promise<void>;
    onSelectRecentlyClosed: TabsBarMenuProps["onSelectRecentlyClosed"];
    onRestoreRecentlyClosedGroup: TabsBarMenuProps["onRestoreRecentlyClosedGroup"];
    onReorder: (items: TabItem[], movedTabId: string) => void;
    onEBTEvent: (event: TabsEBTEvent) => void;
    onClearRecentlyClosed: TabsBarMenuProps["onClearRecentlyClosed"];
    customNewTabButton?: React.ReactElement;
    disableTabsBarMenu?: boolean;
} & React.RefAttributes<TabsBarApi>>;
