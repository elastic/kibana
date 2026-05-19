import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for a {@link SelectInput} component.
 */
export interface SelectInputProps extends InputProps<'select'> {
    /** Specify the option labels to their values. */
    optionLabels: Record<string, string | number>;
    /** Specify the option values. */
    optionValues: Array<string | number>;
}
/**
 * Component for manipulating a `select` field.
 */
export declare const SelectInput: ({ field, unsavedChange, onInputChange, optionLabels, optionValues: optionsProp, isSavingEnabled, }: SelectInputProps) => React.JSX.Element;
