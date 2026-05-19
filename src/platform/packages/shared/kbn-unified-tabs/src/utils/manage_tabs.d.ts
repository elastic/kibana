import type { TabItem } from '../types';
export interface TabsState {
    items: TabItem[];
    selectedItem: TabItem | null;
}
export declare const hasSingleTab: ({ items }: TabsState) => boolean;
export declare const isLastTab: ({ items }: TabsState, item: TabItem) => boolean;
export declare const addTab: ({ items, selectedItem }: TabsState, item: TabItem, maxItemsCount: number | undefined) => TabsState;
export declare const selectTab: ({ items, selectedItem }: TabsState, item: TabItem) => TabsState;
export declare const selectRecentlyClosedTab: ({ items }: TabsState, nextSelectedItem: TabItem) => TabsState;
export declare const closeTab: ({ items, selectedItem }: TabsState, item: TabItem) => TabsState;
export declare const insertTabAfter: ({ items, selectedItem }: TabsState, item: TabItem, insertAfterItem: TabItem, maxItemsCount: number | undefined) => TabsState;
export declare const replaceTabWith: ({ items, selectedItem }: TabsState, item: TabItem, replaceWithItem: TabItem) => TabsState;
export declare const closeOtherTabs: (_: TabsState, item: TabItem) => TabsState;
export declare const closeTabsToTheRight: ({ items, selectedItem }: TabsState, item: TabItem) => TabsState;
