import React from 'react';
import type { EuiTextProps } from '@elastic/eui';
interface Props {
    count?: number;
    status: string;
    textProps?: EuiTextProps;
}
export declare function ClusterHealth({ count, status, textProps }: Props): React.JSX.Element | null;
export {};
