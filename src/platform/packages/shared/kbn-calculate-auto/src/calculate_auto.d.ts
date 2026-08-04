import type { Duration } from 'moment';
export declare const calculateAuto: {
    near: (buckets: number, duration: Duration) => Duration | undefined;
    lessThan: (buckets: number, duration: Duration) => Duration | undefined;
    atLeast: (buckets: number, duration: Duration) => Duration | undefined;
};
