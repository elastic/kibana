import React from 'react';
import type { InputProps } from '../types';
/**
 * Props for an {@link ArrayFieldInput} component.
 */
export type ArrayInputProps = InputProps<'array'>;
/**
 * Component for manipulating an `array` field.
 */
export declare const ArrayInput: ({ field, unsavedChange, isSavingEnabled, onInputChange, }: ArrayInputProps) => React.JSX.Element;
