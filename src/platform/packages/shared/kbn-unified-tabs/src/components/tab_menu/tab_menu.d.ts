import React from 'react';
import type { GetTabMenuItems, TabItem } from '../../types';
export interface TabMenuProps {
    item: TabItem;
    getTabMenuItems: GetTabMenuItems;
    isPopoverOpen: boolean;
    isSelected: boolean;
    setPopover: (isOpen: boolean) => void;
    onEnterRenaming: () => void;
}
export declare const TabMenu: React.FC<TabMenuProps>;
