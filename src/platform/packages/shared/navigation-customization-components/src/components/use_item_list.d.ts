import { type DropResult } from '@elastic/eui';
import type { NavigationItemInfo } from '../types';
export declare const VISIBLE_DROPPABLE_ID = "nav-items";
export declare const HIDDEN_DROPPABLE_ID = "hidden-nav-items";
export declare const useItemList: (initial: NavigationItemInfo[]) => {
    items: NavigationItemInfo[];
    setItems: import("react").Dispatch<import("react").SetStateAction<NavigationItemInfo[]>>;
    visibleItems: NavigationItemInfo[];
    hiddenItems: NavigationItemInfo[];
    hasChanges: boolean;
    handleDragEnd: ({ source, destination }: DropResult) => void;
    toggleItemVisibility: (itemId: string) => void;
};
