import type { TimeRange } from '@kbn/es-query';
export declare const getRelativeTimeValueAndUnitFromTimeString: (dateString?: string) => {
    value: number;
    unit: string | undefined;
    roundingUnit: string | undefined;
} | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeDate: (dateString?: string, options?: {
    roundUp?: boolean;
}) => Date | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeString: (dateString: string, options?: {
    roundUp?: boolean;
}) => string;
export declare const isTimeRangeAbsoluteTime: (timeRange?: TimeRange) => boolean;
