import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
interface Props {
    minute?: string;
    minuteOptions: EuiSelectOption[];
    hour?: string;
    hourOptions: EuiSelectOption[];
    day?: string;
    dayOptions: EuiSelectOption[];
    onChange: ({ minute, hour, day }: {
        minute?: string;
        hour?: string;
        day?: string;
    }) => void;
}
export declare const CronWeekly: React.FunctionComponent<Props>;
export {};
