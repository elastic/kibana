import React from 'react';
import type { FieldIconProps } from '../field_icon';
export interface FieldNameWithIconProps {
    name: string;
    type?: FieldIconProps['type'];
}
export declare const FieldNameWithIcon: ({ name, type }: FieldNameWithIconProps) => string | React.JSX.Element;
