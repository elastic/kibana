import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
interface Props {
    minute?: string;
    minuteOptions: EuiSelectOption[];
    hour?: string;
    hourOptions: EuiSelectOption[];
    date?: string;
    dateOptions: EuiSelectOption[];
    onChange: ({ minute, hour, date }: {
        minute?: string;
        hour?: string;
        date?: string;
    }) => void;
}
export declare const CronMonthly: React.FunctionComponent<Props>;
export {};
