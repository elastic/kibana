import type { TimeRangeBoundsOption } from '../types';
export interface PrettifyValueOptions {
    /** Optional consumer-provided delimiter (from `TimeRangeTransformOptions`). */
    extraDelimiter?: string;
    /** Presets to match against — if the value's bounds match a preset, its label is used. */
    presets?: TimeRangeBoundsOption[];
}
/**
 * Prettifies a controlled `value` string for display in the edit input.
 *
 * @param value The raw value string, typically `"{start} to {end}"`.
 * @param options Optional config: extra delimiter and presets.
 * @returns A simplified string, or the original value if no simplification applies.
 */
export declare const prettifyValue: (value: string, options?: PrettifyValueOptions) => string;
