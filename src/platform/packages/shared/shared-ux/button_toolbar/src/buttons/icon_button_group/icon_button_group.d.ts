import React from 'react';
import type { EuiButtonGroupOptionProps, IconType, EuiButtonGroupProps } from '@elastic/eui';
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
    /**
     * HTML `title` attribute for the native browser tooltip. Defaults to `label`.
     * Ignored when `toolTipContent` is provided — the native tooltip is suppressed
     * so only the `EuiToolTip` is shown.
     */
    title?: string;
    /** Test subject for button */
    'data-test-subj'?: string;
    /** EBT click action */
    'data-ebt-action'?: string;
    /** EBT click element */
    'data-ebt-element'?: string;
    /** Optional EBT click detail */
    'data-ebt-detail'?: string;
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
}
/**
 * A group of buttons each performing an action, represented by an icon.
 */
export declare const IconButtonGroup: ({ buttons, legend, buttonSize, 'data-test-subj': dataTestSubj, }: Props) => React.JSX.Element;
