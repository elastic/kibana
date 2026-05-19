import React from 'react';
import { type IconType } from '@elastic/eui';
export interface SplitButtonWithNotificationProps {
    label: string;
    onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
    iconType?: IconType;
    isDisabled?: boolean;
    isLoading?: boolean;
    isMainButtonLoading?: boolean;
    isSelected?: boolean;
    href?: string;
    target?: string;
    id?: string;
    'data-test-subj'?: string;
    fullWidth?: boolean;
    'aria-haspopup'?: 'menu';
    secondaryButtonAriaLabel: string;
    onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
    isSecondaryButtonDisabled?: boolean;
    showNotificationIndicator?: boolean;
    notificationIndicatorTooltipContent?: string;
}
export declare const SplitButtonWithNotification: ({ isDisabled, isLoading, "data-test-subj": dataTestSubj, fullWidth, label, onClick, iconType, isMainButtonLoading, isSelected, href, target, id, "aria-haspopup": ariaHasPopup, secondaryButtonAriaLabel, onSecondaryButtonClick, isSecondaryButtonDisabled, showNotificationIndicator, notificationIndicatorTooltipContent, }: SplitButtonWithNotificationProps) => React.JSX.Element;
