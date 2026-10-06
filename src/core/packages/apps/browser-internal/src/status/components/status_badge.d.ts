import type { FC } from 'react';
import type { StatusState } from '../lib';
export type StatusWithoutMessage = Omit<StatusState, 'message'>;
interface StatusBadgeProps {
    status: StatusWithoutMessage;
    'data-test-subj'?: string;
}
export declare const StatusBadge: FC<StatusBadgeProps>;
export {};
