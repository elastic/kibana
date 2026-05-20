import type { Moment } from 'moment';
export declare enum Frequency {
    YEARLY = 0,
    MONTHLY = 1,
    WEEKLY = 2,
    DAILY = 3,
    HOURLY = 4,
    MINUTELY = 5,
    SECONDLY = 6
}
export declare enum Weekday {
    MO = 1,
    TU = 2,
    WE = 3,
    TH = 4,
    FR = 5,
    SA = 6,
    SU = 7
}
export type WeekdayStr = 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA' | 'SU';
export interface IterOptions {
    refDT: Moment;
    wkst?: Weekday | number | null;
    byyearday?: number[] | null;
    bymonth?: number[] | null;
    bysetpos?: number[] | null;
    bymonthday?: number[] | null;
    byweekday?: Weekday[] | null;
    byhour?: number[] | null;
    byminute?: number[] | null;
    bysecond?: number[] | null;
}
export type Options = Omit<IterOptions, 'refDT'> & {
    dtstart: Date;
    freq?: Frequency;
    interval?: number;
    until?: Date | null;
    count?: number;
    tzid: string;
};
export type ConstructorOptions = Omit<Options, 'byweekday' | 'wkst'> & {
    byweekday?: Array<string | number> | null;
    wkst?: Weekday | WeekdayStr | number | null;
};
