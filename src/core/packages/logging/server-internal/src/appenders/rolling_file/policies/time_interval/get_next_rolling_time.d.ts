import type { Duration } from 'moment-timezone';
/**
 * Return the next rollout time, given current time and rollout interval
 */
export declare const getNextRollingTime: (currentTime: number, interval: Duration, modulate: boolean) => number;
