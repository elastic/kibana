import React from 'react';
import type { TimeRange } from '@kbn/es-query';
interface Props {
    timeRange?: TimeRange;
    isAbsoluteTimeByDefault: boolean;
    onTimeTypeChange?: (isAbsolute: boolean) => void;
}
export declare const TimeTypeSection: ({ timeRange, onTimeTypeChange, isAbsoluteTimeByDefault, }: Props) => React.JSX.Element | null;
export {};
