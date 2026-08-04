import type { AggregateQuery, Query } from '@kbn/es-query';
import type { CoreStart } from '@kbn/core/public';
import type { TabsEventDataKeys } from './event_data_keys';
export interface TabItem {
    id: string;
    label: string;
    duplicatedFromId?: string;
    restoredFromId?: string;
    customMenuButton?: React.JSX.Element;
}
export type RecentlyClosedTabItem = TabItem & {
    closedAt: number;
};
export interface TabsSizeConfig {
    isScrollable: boolean;
    regularTabMaxWidth: number;
    regularTabMinWidth: number;
}
export declare enum TabStatus {
    DEFAULT = "default",
    RUNNING = "running",
    SUCCESS = "success",
    ERROR = "danger"
}
export interface TabPreviewData {
    title?: string;
    query: AggregateQuery | Query;
    status: TabStatus;
}
export declare enum TabMenuItemName {
    enterRenamingMode = "enterRenamingMode",
    duplicate = "duplicate",
    closeOtherTabs = "closeOtherTabs",
    closeTabsToTheRight = "closeTabsToTheRight"
}
export interface TabMenuItemWithClick {
    'data-test-subj': string;
    name: TabMenuItemName | string;
    label: string;
    onClick: (() => void) | null;
}
export type TabMenuItem = TabMenuItemWithClick | 'divider';
export type GetTabMenuItems = (item: TabItem) => TabMenuItem[];
export interface TabsServices {
    core: {
        chrome?: CoreStart['chrome'];
    };
}
export declare enum TabsEventName {
    tabCreated = "tabCreated",
    tabClosed = "tabClosed",
    tabSwitched = "tabSwitched",
    tabReordered = "tabReordered",
    tabDuplicated = "tabDuplicated",
    tabClosedOthers = "tabClosedOthers",
    tabClosedToTheRight = "tabClosedToTheRight",
    tabRenamed = "tabRenamed",
    tabsLimitReached = "tabsLimitReached",
    tabsKeyboardShortcutsUsed = "tabsKeyboardShortcutsUsed",
    tabsRestoredOnLoad = "tabsRestoredOnLoad",
    tabSelectRecentlyClosed = "tabSelectRecentlyClosed"
}
export interface TabsEBTEvent {
    [TabsEventDataKeys.TABS_EVENT_NAME]: TabsEventName;
    [TabsEventDataKeys.TAB_ID]?: string;
    [TabsEventDataKeys.TOTAL_TABS_OPEN]?: number;
    [TabsEventDataKeys.FROM_INDEX]?: number;
    [TabsEventDataKeys.TO_INDEX]?: number;
    [TabsEventDataKeys.REMAINING_TABS_COUNT]?: number;
    [TabsEventDataKeys.CLOSED_TABS_COUNT]?: number;
    [TabsEventDataKeys.SHORTCUT_USED]?: string;
}
