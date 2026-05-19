import { type OperatorFunction } from 'rxjs';
/**
 * An RxJS operator implementing the exponential moving average function.
 *
 * @see https://en.wikipedia.org/wiki/Exponential_smoothing
 * @param period The period of time.
 * @param interval The interval between values.
 * @returns An operator emitting smoothed values.
 * @remarks
 * Uses **accumulating mean value** until the observation window is full (i.e., until enough samples have been received to cover the specified period),
 * then switches to exponential smoothing for subsequent values. The switch happens when the number of values emitted reaches `period / interval`.
 * This ensures the initial output isn't biased by insufficient data, and provides a smooth transition to exponential smoothing.
 */
export declare function exponentialMovingAverage(period: number, interval: number): OperatorFunction<number, number>;
