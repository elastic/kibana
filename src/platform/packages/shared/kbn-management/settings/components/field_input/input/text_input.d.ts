import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for a {@link TextInput} component.
 */
export type TextInputProps = InputProps<'string'>;
/**
 * Component for manipulating a `string` field.
 */
export declare const TextInput: ({ field, unsavedChange, isSavingEnabled, onInputChange, }: TextInputProps) => React.JSX.Element;
