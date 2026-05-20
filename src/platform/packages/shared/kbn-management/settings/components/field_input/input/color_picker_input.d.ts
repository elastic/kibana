import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for a {@link ColorPickerInput} component.
 */
export type ColorPickerInputProps = InputProps<'color'>;
/**
 * Component for manipulating a `color` field.
 */
export declare const ColorPickerInput: ({ field, unsavedChange, isSavingEnabled, onInputChange, }: ColorPickerInputProps) => React.JSX.Element;
