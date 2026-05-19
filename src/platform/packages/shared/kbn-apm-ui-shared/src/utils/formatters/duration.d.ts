import type { Maybe } from '@kbn/apm-types-shared';
export type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'milliseconds';
type DurationTimeUnit = TimeUnit | 'microseconds';
interface FormatterOptions {
    defaultValue?: string;
}
interface ConvertedDuration {
    value: string;
    unit?: string;
    formatted: string;
}
export type TimeFormatter = (value: number, options?: FormatterOptions) => ConvertedDuration;
type TimeFormatterBuilder = (max: number, threshold?: number, scalingFactor?: number) => TimeFormatter;
export declare const toMicroseconds: (value: number, timeUnit: TimeUnit) => number;
export declare function getDurationUnitKey(max: number, threshold?: number): DurationTimeUnit;
export declare const getDurationFormatter: TimeFormatterBuilder;
export declare function asDuration(value: Maybe<number>, { defaultValue }?: FormatterOptions): string;
export {};
