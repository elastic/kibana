import type { FC } from 'react';
import type { FormattedStatus } from '../lib';
interface StatusSectionProps {
    id: string;
    title: string;
    statuses: FormattedStatus[];
}
export declare const StatusSection: FC<StatusSectionProps>;
export {};
