import React from 'react';
import type { AppMenuPrimaryActionItem } from '../types';
type AppMenuActionButtonProps = AppMenuPrimaryActionItem & {
    isPopoverOpen: boolean;
    onPopoverToggle: () => void;
    onPopoverClose: () => void;
    onCloseOverflowButton?: () => void;
    fullWidth?: boolean;
};
export declare const AppMenuActionButton: (props: AppMenuActionButtonProps) => React.JSX.Element;
export {};
