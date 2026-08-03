import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for a {@link NumberInput} component.
 */
export type NumberInputProps = InputProps<'number'>;
/**
 * Component for manipulating a `number` field.
 */
export declare const NumberInput: ({ field, unsavedChange, isSavingEnabled, onInputChange, }: NumberInputProps) => React.JSX.Element;
