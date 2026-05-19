import React from 'react';
import type { IconSize } from '@elastic/eui';
import { type EuiIconProps } from '@elastic/eui';
interface Props extends Omit<EuiIconProps, 'type'> {
    type?: string;
    subtype?: string;
    size?: IconSize;
}
export declare function SpanIcon({ type, subtype, size, ...props }: Props): React.JSX.Element;
export {};
