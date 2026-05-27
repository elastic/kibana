import type { Moment } from 'moment';
export type TimeRange = {
    from: string;
    to: string;
    mode?: 'absolute' | 'relative';
};
export interface TimeRangeBounds {
    min: Moment | undefined;
    max: Moment | undefined;
}
