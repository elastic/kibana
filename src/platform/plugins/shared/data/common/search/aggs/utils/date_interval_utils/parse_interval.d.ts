import moment from 'moment';
import type { Unit } from '@kbn/datemath';
export declare const splitStringInterval: (interval: string) => {
    value: number;
    unit: Unit;
} | null;
export declare function parseInterval(interval: string): moment.Duration | null;
