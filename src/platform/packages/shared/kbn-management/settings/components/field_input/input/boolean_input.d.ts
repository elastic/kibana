import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for a {@link BooleanInput} component.
 */
export type BooleanInputProps = InputProps<'boolean'>;
/**
 * Component for manipulating a `boolean` field.
 */
export declare const BooleanInput: ({ field, unsavedChange, isSavingEnabled, onInputChange, }: BooleanInputProps) => React.JSX.Element;
