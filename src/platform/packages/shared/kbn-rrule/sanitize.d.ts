import type { Options } from './types';
export declare function sanitizeOptions(opts: Options): {
    wkst?: (import("./types").Weekday | number | null) | undefined;
    byyearday?: number[] | null | undefined;
    bymonth?: number[] | null | undefined;
    bysetpos?: number[] | null | undefined;
    bymonthday?: number[] | null | undefined;
    byweekday?: import("./types").Weekday[] | null | undefined;
    byhour?: number[] | null | undefined;
    byminute?: number[] | null | undefined;
    bysecond?: number[] | null | undefined;
    dtstart: Date;
    freq?: import("./types").Frequency;
    interval?: number;
    until?: Date | null;
    count?: number;
    tzid: string;
};
