import type { ReactNode, HTMLAttributes, ButtonHTMLAttributes } from 'react';
import React from 'react';
import { type CommonProps } from '@elastic/eui';
export interface FieldButtonProps extends HTMLAttributes<HTMLDivElement> {
    /**
     * Label for the button
     */
    fieldName: ReactNode;
    /**
     * Icon representing the field type.
     * Recommend using FieldIcon
     */
    fieldIcon?: ReactNode;
    /**
     * An optional node to place inside and at the end of the <button>
     */
    fieldInfoIcon?: ReactNode;
    /**
     * An optional node to place outside of and to the right of the <button>
     */
    fieldAction?: ReactNode;
    /**
     * Adds a forced focus ring to the whole component
     */
    isActive?: boolean;
    /**
     * Custom drag handle element
     */
    dragHandle?: React.ReactElement;
    /**
     * Use the xs size in condensed areas
     */
    size: ButtonSize;
    /**
     * Whether to skip side paddings
     */
    flush?: 'both';
    /**
     * Custom class name
     */
    className?: string;
    /**
     * The component will render a `<button>` when provided an `onClick`
     */
    onClick?: () => void;
    /**
     * Applies to the inner `<button>`  or `<div>`
     */
    dataTestSubj?: string;
    /**
     * Pass more button props to the `<button>` element
     */
    buttonProps?: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps;
}
export type ButtonSize = 'xs' | 's';
export declare function FieldButton({ size, isActive, fieldIcon, fieldName, fieldInfoIcon, fieldAction, flush, className, dragHandle, onClick, dataTestSubj, buttonProps, ...rest }: FieldButtonProps): React.JSX.Element;
