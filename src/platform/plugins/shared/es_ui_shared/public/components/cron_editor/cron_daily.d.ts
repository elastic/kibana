import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
interface Props {
    minute?: string;
    minuteOptions: EuiSelectOption[];
    hour?: string;
    hourOptions: EuiSelectOption[];
    onChange: ({ minute, hour }: {
        minute?: string;
        hour?: string;
    }) => void;
}
export declare const CronDaily: React.FunctionComponent<Props>;
export {};
