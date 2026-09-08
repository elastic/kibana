import type { TimeRange, TimeRangeTransformOptions, TimeRangeBoundsOption } from '../types';
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
 * input unchanged if it is not an alias. English-only — see
 * {@link buildBoundsToAliasMap}.
 *
 * @example
 * resolveNamedRangeAlias('td')    // "today"
 * resolveNamedRangeAlias('yd')    // "yesterday"
 * resolveNamedRangeAlias('today') // "today"
 */
export declare function resolveNamedRangeAlias(text: string): string;
/** Matches text against preset labels (case-insensitive). */
export declare function matchPreset(text: string, presets: TimeRangeBoundsOption[]): TimeRangeBoundsOption | undefined;
/**
 * Parses free-form text into a structured {@link TimeRange}.
 *
 * Supports presets, named ranges, natural durations/instants, shorthand
 * datemath, unix timestamps, and absolute dates. Named ranges, durations,
 * instants, and delimiters are matched against `options.locale` merged with
 * English, so English is always parseable alongside whichever locale is
 * active. Shorthand datemath, unix timestamps, and absolute dates are
 * locale-invariant.
 */
export declare function textToTimeRange(text: string, options?: TimeRangeTransformOptions): TimeRange;
