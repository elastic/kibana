import React, { type ReactElement } from 'react';
import type { AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem } from '../types';
interface AppMenuContextMenuProps {
    tooltipContent?: string | (() => string | undefined);
    tooltipTitle?: string | (() => string | undefined);
    anchorElement: ReactElement;
    anchorDomElement?: HTMLElement;
    items: AppMenuPopoverItem[];
    staticItems?: AppMenuItemType[];
    isOpen: boolean;
    popoverWidth?: number;
    primaryActionItem?: AppMenuPrimaryActionItem;
    popoverTestId?: string;
    onClose: () => void;
    onCloseOverflowButton?: () => void;
}
export declare const AppMenuPopover: ({ items, staticItems, anchorElement, anchorDomElement, tooltipContent, tooltipTitle, isOpen, popoverWidth, primaryActionItem, popoverTestId, onClose, onCloseOverflowButton, }: AppMenuContextMenuProps) => React.JSX.Element | null;
export {};
