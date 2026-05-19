import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
interface Props {
    minute?: string;
    minuteOptions: EuiSelectOption[];
    onChange: ({ minute }: {
        minute?: string;
    }) => void;
}
export declare const CronHourly: React.FunctionComponent<Props>;
export {};
