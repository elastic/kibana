import React from 'react';
import type { IconType } from '@elastic/eui';
import type { EuiButtonPropsForButton } from '@elastic/eui/src/components/button/button';
type ToolbarButtonTypes = 'primary' | 'empty';
type ToolbarButtonFontWeights = 'normal' | 'bold';
type ButtonPositions = 'left' | 'right' | 'center' | 'none';
type ButtonRenderStyle = 'standard' | 'iconButton';
interface ToolbarButtonCommonProps extends Pick<EuiButtonPropsForButton, 'onClick' | 'onBlur' | 'iconType' | 'size' | 'data-test-subj' | 'isDisabled' | 'aria-label' | 'id'> {
    /**
     * Render style of the toolbar button
     */
    as?: ButtonRenderStyle;
    type?: ToolbarButtonTypes;
    /**
     * Adjusts the borders for groupings
     */
    groupPosition?: ButtonPositions;
}
type ToolbarStandardButton = Pick<EuiButtonPropsForButton, 'fullWidth' | 'isLoading' | 'iconSide'> & Omit<ToolbarButtonCommonProps, 'label'> & {
    as?: Extract<ButtonRenderStyle, 'standard'>;
    /**
     * Display text for toolbar button
     */
    label: React.ReactNode;
    /**
     * Determines if the button will have a down arrow or not
     */
    hasArrow?: boolean;
    /**
     * Determines prominence
     */
    fontWeight?: ToolbarButtonFontWeights;
};
type ToolbarIconButton = ToolbarButtonCommonProps & {
    as: Extract<ButtonRenderStyle, 'iconButton'>;
    iconType: IconType;
    label?: string;
};
/**
 * Props for `PrimaryButton`.
 */
export type Props<T extends ButtonRenderStyle> = T extends Extract<ButtonRenderStyle, 'iconButton'> ? ToolbarIconButton : ToolbarStandardButton;
declare const ToolbarStandardButton: ({ hasArrow, fontWeight, type, label, iconSide, iconType, fullWidth, isDisabled, groupPosition, ...rest }: Omit<ToolbarStandardButton, "as">) => React.JSX.Element;
declare const ToolbarIconButton: ({ size, type, label, isDisabled, groupPosition, ...rest }: Omit<ToolbarIconButton, "as">) => React.JSX.Element;
export declare function ToolbarButton<T extends ButtonRenderStyle>(props: Props<T>): React.JSX.Element;
export {};
