import React from 'react';
import type { ResetInputRef } from '@kbn/management-settings-types';
import type { InputProps } from '../types';
/**
 * Props for a {@link ImageInput} component.
 */
export type ImageInputProps = InputProps<'image'>;
/**
 * Component for manipulating an `image` field.
 */
export declare const ImageInput: React.ForwardRefExoticComponent<ImageInputProps & React.RefAttributes<ResetInputRef>>;
