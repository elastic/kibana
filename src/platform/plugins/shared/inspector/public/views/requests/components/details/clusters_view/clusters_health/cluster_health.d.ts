import React from 'react';
import type { EuiTextProps } from '@elastic/eui';
import { type ClusterHealthStatus } from './gradient';
interface Props {
    count?: number;
    status: ClusterHealthStatus;
    textProps?: EuiTextProps;
}
export type { ClusterHealthStatus };
export declare function ClusterHealth({ count, status, textProps }: Props): React.JSX.Element | null;
