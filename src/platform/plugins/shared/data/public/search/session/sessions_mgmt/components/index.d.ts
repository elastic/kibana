import type { EuiTextProps } from '@elastic/eui';
import React from 'react';
export type { OnActionComplete } from './table/actions';
export { PopoverActionsMenu } from './table/actions';
export declare const TableText: ({ children, ...props }: EuiTextProps) => React.JSX.Element;
export interface StatusDef {
    textColor?: EuiTextProps['color'];
    icon?: React.ReactElement;
    label: React.ReactElement;
    toolTipContent: string;
}
