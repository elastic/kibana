import { EuiButton } from '@elastic/eui';
import type { IconType } from '@elastic/eui';
import React from 'react';
export type SplitButtonProps = React.ComponentProps<typeof EuiButton> & {
    isMainButtonLoading?: boolean;
    isMainButtonDisabled?: boolean;
    iconOnly?: boolean;
    isSecondaryButtonLoading?: boolean;
    isSecondaryButtonDisabled?: boolean;
    secondaryButtonIcon: IconType;
    secondaryButtonAriaLabel?: string;
    secondaryButtonTitle?: string;
    secondaryButtonFill?: boolean;
    onSecondaryButtonClick?: React.MouseEventHandler<HTMLButtonElement>;
};
export declare const SplitButton: ({ isDisabled, disabled, isLoading, color, size, isSecondaryButtonLoading, isSecondaryButtonDisabled, secondaryButtonIcon, secondaryButtonAriaLabel, secondaryButtonTitle, secondaryButtonFill, onSecondaryButtonClick, isMainButtonLoading, isMainButtonDisabled, iconOnly, iconType, ...mainButtonProps }: SplitButtonProps) => React.JSX.Element;
