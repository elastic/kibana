import React from 'react';
import type { AppMenuItemType, AppMenuPrimaryActionItem } from '../types';
interface AppMenuShowMoreButtonProps {
    items: AppMenuItemType[];
    staticItems?: AppMenuItemType[];
    isPopoverOpen: boolean;
    primaryActionItem?: AppMenuPrimaryActionItem;
    onPopoverToggle: () => void;
    onPopoverClose: () => void;
}
export declare const AppMenuOverflowButton: ({ items, staticItems, isPopoverOpen, primaryActionItem, onPopoverToggle, onPopoverClose, }: AppMenuShowMoreButtonProps) => React.JSX.Element | null;
export {};
