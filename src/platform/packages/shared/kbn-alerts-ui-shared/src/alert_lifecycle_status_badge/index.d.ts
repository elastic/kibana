import React from 'react';
import type { AlertStatus } from '@kbn/rule-data-utils';
export interface AlertLifecycleStatusBadgeProps {
    alertStatus: AlertStatus;
    flapping?: boolean;
}
export declare const AlertLifecycleStatusBadge: React.MemoExoticComponent<(props: AlertLifecycleStatusBadgeProps) => React.JSX.Element>;
