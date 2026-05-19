import React from 'react';
import type { AppMenuPrimaryActionItem } from '../types';
interface AppMenuPopoverActionButtonsProps {
    primaryActionItem?: AppMenuPrimaryActionItem;
    onCloseOverflowButton?: () => void;
}
export declare const AppMenuPopoverActionButtons: ({ primaryActionItem, onCloseOverflowButton, }: AppMenuPopoverActionButtonsProps) => React.JSX.Element | null;
export {};
