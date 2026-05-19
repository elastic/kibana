import type moment from 'moment-timezone';
import type { ConstructorOptions , Frequency} from './types';
import { type IterOptions } from './types';
type AllResult = Date[] & {
    hasMore?: boolean;
};
export declare class RRule {
    private options;
    constructor(options: ConstructorOptions);
    private dateset;
    between(start: Date, end: Date): Date[];
    before(dt: Date): Date;
    after(dt: Date): Date | null;
    all(limit?: number): AllResult;
    static isValid(options: ConstructorOptions): boolean;
}
export declare const getNextRecurrences: ({ refDT, wkst, byyearday, bymonth, bymonthday, byweekday, byhour, byminute, bysecond, bysetpos, freq, interval, }: IterOptions & {
    freq?: Frequency;
    interval?: number;
}) => moment.Moment[];
export {};
