import type { Unit } from '@kbn/datemath';
export declare class InvalidEsCalendarIntervalError extends Error {
    readonly interval: string;
    readonly value: number;
    readonly unit: Unit;
    readonly type: string;
    constructor(interval: string, value: number, unit: Unit, type: string);
}
