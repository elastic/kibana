import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
interface Props {
    minute?: string;
    minuteOptions: EuiSelectOption[];
    hour?: string;
    hourOptions: EuiSelectOption[];
    date?: string;
    dateOptions: EuiSelectOption[];
    month?: string;
    monthOptions: EuiSelectOption[];
    onChange: ({ minute, hour, date, month, }: {
        minute?: string;
        hour?: string;
        date?: string;
        month?: string;
    }) => void;
}
export declare const CronYearly: React.FunctionComponent<Props>;
export {};
