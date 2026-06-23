import React from 'react';
import type { AppMenuItemType } from '../types';
type AppMenuItemProps = AppMenuItemType & {
    isPopoverOpen: boolean;
    onPopoverToggle: () => void;
    onPopoverClose: () => void;
};
export declare const AppMenuItem: ({ run, id, htmlId, label, testId, iconType, disableButton, href, target, isLoading, tooltipContent, tooltipTitle, items, isPopoverOpen, hidden, popoverWidth, popoverTestId, onPopoverToggle, onPopoverClose, }: AppMenuItemProps) => React.JSX.Element;
export {};
