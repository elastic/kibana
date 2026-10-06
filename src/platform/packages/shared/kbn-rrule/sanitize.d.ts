import type { Options } from './types';
export declare function sanitizeOptions(opts: Options): {
    wkst?: import("@kbn/task-manager-plugin/server").Weekday | number | null;
    byyearday?: number[] | null;
    bymonth?: number[] | null;
    bysetpos?: number[] | null;
    bymonthday?: number[] | null;
    byweekday?: import("@kbn/task-manager-plugin/server").Weekday[] | null;
    byhour?: number[] | null;
    byminute?: number[] | null;
    bysecond?: number[] | null;
    dtstart: Date;
    freq?: import("@kbn/task-manager-plugin/server").Frequency;
    interval?: number;
    until?: Date | null;
    count?: number;
    tzid: string;
};
