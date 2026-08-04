export declare const LENS_HISTOGRAM_GRANULARITY_DEFAULT_NUMERIC_VALUE = 5;
export declare const LENS_HISTOGRAM_GRANULARITY_MIN = 1;
export declare const LENS_HISTOGRAM_GRANULARITY_MAX = 7;
export declare const LENS_HISTOGRAM_GRANULARITY_DEFAULT_VALUE = "auto";
export declare const LENS_HISTOGRAM_EMPTY_ROWS_DEFAULT = true;
export declare const LENS_TERMS_LIMIT_DEFAULT = 5;
export declare const LENS_TERMS_MISSING_BUCKET_DEFAULT = false;
export declare const LENS_FORMAT_NUMBER_DECIMALS_DEFAULT = 2;
export declare const LENS_FORMAT_COMPACT_DEFAULT = false;
/** Default source unit in Lens as code API (`from`). */
export declare const LENS_DURATION_API_INPUT_UNIT_DEFAULT = "s";
/** Default display unit in Lens as code API (`to`). */
export declare const LENS_DURATION_API_OUTPUT_UNIT_DEFAULT = "auto-approximate";
export declare const LENS_SAMPLING_MIN_VALUE = 0;
export declare const LENS_SAMPLING_MAX_VALUE = 1;
export declare const LENS_SAMPLING_DEFAULT_VALUE = 1;
export declare const LENS_IGNORE_GLOBAL_FILTERS_DEFAULT_VALUE = false;
export declare const LENS_PERCENTILE_DEFAULT_VALUE = 95;
export declare const LENS_PERCENTILE_RANK_DEFAULT_VALUE = 0;
export declare const LENS_DATE_HISTOGRAM_EMPTY_ROWS_DEFAULT = true;
export declare const LENS_DATE_HISTOGRAM_INTERVAL_DEFAULT = "auto";
export declare const LENS_DATE_HISTOGRAM_IGNORE_TIME_RANGE_DEFAULT = false;
export declare const LENS_STATIC_VALUE_DEFAULT = 100;
export declare const LENS_LAST_VALUE_DEFAULT_MULTI_VALUE = false;
export declare const LENS_RANGE_DEFAULT_INTERVAL = 1000;
export declare const LENS_MOVING_AVERAGE_DEFAULT_WINDOW = 5;
/**
 * Palette ids valid for a `distributed_palette` (color-by-value across a numeric range).
 *
 * These must be the dynamic-coloring gradient palettes registered in the charts plugin
 * (the ones built via `buildGradient`, which sets `canDynamicColoring: true`, and are the only
 * palettes the Lens color-by-value picker offers). This is the exact set produced by
 * `buildPalettes` in
 * `src/platform/plugins/shared/charts/public/services/palettes/palettes.tsx`.
 *
 * This package cannot import the charts plugin, so the list is duplicated here and must be kept
 * in sync manually if that registry changes.
 */
export declare const PALETTE_IDS: readonly ["status", "temperature", "complementary", "negative", "positive", "cool", "warm", "gray"];
export type PaletteId = (typeof PALETTE_IDS)[number];
