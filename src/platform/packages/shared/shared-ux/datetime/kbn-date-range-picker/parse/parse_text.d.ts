import type { TimeRange, TimeRangeTransformOptions, TimeRangeBoundsOption } from '../types';
/** The word delimiters recognised by the parser (excluding the universal dash). */
export declare const PARSER_DELIMITERS: readonly string[];
/**
 * Returns the shorthand alias for a named range identified by its bounds,
 * or `null` if no alias exists.
 *
 * @example
 * getNamedRangeAlias('now/d', 'now/d')       // "td"
 * getNamedRangeAlias('now-1d/d', 'now-1d/d') // "yd"
 * getNamedRangeAlias('now-15m', 'now')        // null
 */
export declare function getNamedRangeAlias(start: string, end: string): string | null;
/**
 * Resolves a named range alias to its canonical name, or returns the
 * input unchanged if it is not an alias.
 *
 * @example
 * resolveNamedRangeAlias('td')    // "today"
 * resolveNamedRangeAlias('yd')    // "yesterday"
 * resolveNamedRangeAlias('today') // "today"
 */
export declare function resolveNamedRangeAlias(text: string): string;
/** Builds a regex that splits text on a word delimiter surrounded by whitespace. */
export declare function buildDelimiterPattern(delimiter: string): RegExp | null;
/** Matches text against preset labels (case-insensitive). */
export declare function matchPreset(text: string, presets: TimeRangeBoundsOption[]): TimeRangeBoundsOption | undefined;
/**
 * Parses free-form text into a structured {@link TimeRange}.
 *
 * Supports presets, named ranges, natural durations/instants,
 * shorthand datemath, unix timestamps, and absolute dates.
 */
export declare function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange;
