export type TimeRange = {
    from: string;
    to: string;
    mode?: 'absolute' | 'relative';
};
export interface TimeState {
    timeRange: TimeRange;
    asAbsoluteTimeRange: AbsoluteTimeRange;
    start: number;
    end: number;
}
export interface AbsoluteTimeRange extends TimeRange {
    mode: 'absolute';
}
export interface RelativeTimeRange extends TimeRange {
    mode: 'relative';
}
