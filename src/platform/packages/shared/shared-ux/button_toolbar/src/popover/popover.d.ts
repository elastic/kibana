import React from 'react';
import type { Props as EuiPopoverProps } from '@elastic/eui/src/components/popover/popover';
import type { ToolbarButtonProps } from '../buttons';
type AllowedButtonProps = Omit<ToolbarButtonProps<'standard'>, 'iconSide' | 'onClick' | 'fill' | 'label'>;
type AllowedPopoverProps = Omit<EuiPopoverProps, 'button' | 'isOpen' | 'closePopover' | 'anchorPosition'>;
/**
 * Props for `ToolbarPopover`.
 */
export type Props = AllowedButtonProps & Omit<AllowedPopoverProps, 'children'> & {
    children: (arg: {
        closePopover: () => void;
    }) => React.ReactNode;
    label: NonNullable<ToolbarButtonProps<'standard'>['label']>;
};
/**
 * A button which opens a popover of additional actions within the toolbar.
 */
export declare const ToolbarPopover: ({ type, label, iconType, size, children, isDisabled, ...popover }: Props) => React.JSX.Element;
export {};
