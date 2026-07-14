/**
 * Represents a time range with from and to ISO string dates
 */
export interface TimeRange {
    from: string;
    to: string;
    mode?: 'absolute' | 'relative';
}
export declare function getDateRange({ from, to }: {
    from: string;
    to: string;
}): {
    startDate: number;
    endDate: number;
};
export declare function getDateISORange({ from, to }: {
    from: string;
    to: string;
}): {
    startDate: string;
    endDate: string;
};
export declare function getTimeDifferenceInSeconds(input: {
    startDate: number;
    endDate: number;
} | TimeRange): number;
export declare function getOffsetFromNowInSeconds(epochDate: number): number;
