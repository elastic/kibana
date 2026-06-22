import React, { type ReactElement } from 'react';
import { type PopoverAnchorPosition } from '@elastic/eui';
import type { AppMenuItemType, AppMenuPopoverItem, AppMenuPrimaryActionItem, AppMenuSwitch } from '../types';
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
    switchConfig?: AppMenuSwitch;
    popoverTestId?: string;
    anchorPosition?: PopoverAnchorPosition;
    repositionToCrossAxis?: boolean;
    onClose: () => void;
    onCloseOverflowButton?: () => void;
}
export declare const AppMenuPopover: ({ items, staticItems, anchorElement, anchorDomElement, tooltipContent, tooltipTitle, isOpen, popoverWidth, primaryActionItem, switchConfig, popoverTestId, anchorPosition, repositionToCrossAxis, onClose, onCloseOverflowButton, }: AppMenuContextMenuProps) => React.JSX.Element | null;
export {};
