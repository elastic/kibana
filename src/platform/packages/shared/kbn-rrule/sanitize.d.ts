import type { Options } from './types';
export declare function sanitizeOptions(opts: Options): {
    wkst?: (import("@kbn/task-manager-plugin/server").Weekday | number | null) | undefined;
    byyearday?: number[] | null | undefined;
    bymonth?: number[] | null | undefined;
    bysetpos?: number[] | null | undefined;
    bymonthday?: number[] | null | undefined;
    byweekday?: import("@kbn/task-manager-plugin/server").Weekday[] | null | undefined;
    byhour?: number[] | null | undefined;
    byminute?: number[] | null | undefined;
    bysecond?: number[] | null | undefined;
    dtstart: Date;
    freq?: import("@kbn/task-manager-plugin/server").Frequency;
    interval?: number;
    until?: Date | null;
    count?: number;
    tzid: string;
};
