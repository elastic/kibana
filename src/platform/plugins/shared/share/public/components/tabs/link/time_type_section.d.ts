import React from 'react';
interface TimeRange {
    from: string;
    to: string;
}
interface Props {
    timeRange?: TimeRange;
    isAbsoluteTimeByDefault: boolean;
    onTimeTypeChange?: (isAbsolute: boolean) => void;
}
export declare const TimeTypeSection: ({ timeRange, onTimeTypeChange, isAbsoluteTimeByDefault, }: Props) => React.JSX.Element | null;
export {};
