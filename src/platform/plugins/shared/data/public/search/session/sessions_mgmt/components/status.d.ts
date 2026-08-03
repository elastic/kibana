import React from 'react';
import type { UISession } from '../types';
export declare const getStatusText: (statusType: string) => string;
interface StatusIndicatorProps {
    now?: string;
    session: UISession;
    timezone: string;
}
export declare const StatusIndicator: (props: StatusIndicatorProps) => React.JSX.Element;
export {};
