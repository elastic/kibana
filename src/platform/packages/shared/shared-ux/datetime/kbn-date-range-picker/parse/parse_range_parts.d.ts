import type { DateType } from '../types';
export type DateUnit = 'month' | 'day' | 'year' | 'hour' | 'minute' | 'second' | 'millisecond';
export type PartKind = DateUnit | 'weekday' | 'timezone' | 'relative-direction' | 'relative-value' | 'relative-unit' | 'rounding-unit' | 'separator' | 'literal';
export interface RangePart {
    text: string;
    start: number;
    end: number;
    kind: PartKind;
    navigable: boolean;
    rangeIndex: 0 | 1 | null;
    format?: string;
}
type FormatToken = 'MMMM' | 'MMM' | 'MM' | 'M' | 'YYYY' | 'YY' | 'DD' | 'D' | 'HH' | 'H' | 'mm' | 'ss' | 'SSS' | 'dddd' | 'ddd' | 'ZZ' | 'Z';
type FormatSegment = {
    type: 'literal';
    text: string;
} | {
    type: 'token';
    token: FormatToken;
};
/** Compiles a moment format into literal and token segments. */
export declare const compileFormatTokens: (format: string) => FormatSegment[];
/**
 * Splits edit-input text into semantic range parts. Named ranges, durations,
 * instants, and delimiters are matched against `locale` merged with English.
 *
 * Delimiter occurrences are candidates, not authoritative: the first split
 * whose sides BOTH parse wins, then the whole input is tried as a single
 * side (a phrase like French "il y a 3 jours" contains the delimiter word
 * "a" without being a range), and only then does the first candidate's
 * separator-only decomposition apply (partially-typed ranged input).
 */
export declare function parseInputParts(input: string, rangeType?: [DateType, DateType], locale?: string): RangePart[];
/**
 * Splits idle button display text into semantic range parts. The display
 * delimiter (`→`) is a locale-invariant symbol (it cannot appear inside a
 * phrase, so the first occurrence is authoritative); named ranges/durations/
 * instants within each side are matched against `locale` merged with English.
 */
export declare function parseDisplayParts(display: string, locale?: string): RangePart[];
export {};
