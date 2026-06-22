import React from 'react';
import type { AppMenuItemType, AppMenuPrimaryActionItem, AppMenuSwitch } from '../types';
interface AppMenuShowMoreButtonProps {
    items: AppMenuItemType[];
    staticItems?: AppMenuItemType[];
    isPopoverOpen: boolean;
    primaryActionItem?: AppMenuPrimaryActionItem;
    switchConfig?: AppMenuSwitch;
    onPopoverToggle: () => void;
    onPopoverClose: () => void;
}
export declare const AppMenuOverflowButton: ({ items, staticItems, isPopoverOpen, primaryActionItem, switchConfig, onPopoverToggle, onPopoverClose, }: AppMenuShowMoreButtonProps) => React.JSX.Element | null;
export {};
