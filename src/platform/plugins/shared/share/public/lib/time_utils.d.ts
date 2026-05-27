export declare const getRelativeTimeValueAndUnitFromTimeString: (dateString?: string) => {
    value: number;
    unit: string | undefined;
    roundingUnit: string | undefined;
} | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeDate: (dateString?: string, options?: {
    roundUp?: boolean;
}) => Date | undefined;
export declare const convertRelativeTimeStringToAbsoluteTimeString: (dateString?: string, options?: {
    roundUp?: boolean;
}) => string | undefined;
export declare const isTimeRangeAbsoluteTime: (timeRange?: {
    from: string;
    to: string;
}) => boolean;
