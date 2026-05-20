import React from 'react';
import type { EuiButtonGroupOptionProps, IconType, EuiButtonGroupProps } from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
/**
 * An interface representing a single icon button in the `IconButtonGroup`.
 */
export interface IconButton {
    /** The accessible button label. */
    label: string;
    /** EUI `IconType` to display. */
    iconType: IconType;
    /** Handler for button click. */
    onClick: () => void;
    /** HTML `title` attribute for tooltips if different from `label` */
    title?: string;
    /** Test subject for button */
    'data-test-subj'?: string;
    /** To disable the action **/
    isDisabled?: boolean;
    /** Tooltip content */
    toolTipContent?: EuiButtonGroupOptionProps['toolTipContent'];
    /** Tooltip props */
    toolTipProps?: EuiButtonGroupOptionProps['toolTipProps'];
    /** A11y for button */
    'aria-expanded'?: boolean;
    /** A11y for button */
    'aria-controls'?: string;
    /** CSS for the button */
    css?: SerializedStyles;
}
/**
 * Props for `IconButtonGroup`.
 */
export interface Props {
    /** Required accessible legend for the whole group */
    legend: EuiButtonGroupProps['legend'];
    /** Array of `IconButton` */
    buttons: IconButton[];
    /** Button size */
    buttonSize?: EuiButtonGroupProps['buttonSize'];
    /** Test subject for button group */
    'data-test-subj'?: string;
    /** CSS for the button group */
    css?: SerializedStyles;
}
/**
 * A group of buttons each performing an action, represented by an icon.
 */
export declare const IconButtonGroup: ({ buttons, legend, buttonSize, "data-test-subj": dataTestSubj, css: buttonGroupCss, }: Props) => React.JSX.Element;
