import type { ColorMappingCategoricalType } from '../../../schema/color';
/**
 * Lens-known defaults for XY chart styling.
 *
 * These are the values Lens applies at runtime when the corresponding
 * property is omitted.  We surface them explicitly in API responses
 * ("complete-out" contract) so the caller receives a fully reproducible
 * chart definition that does not depend on runtime defaults.
 */
export declare const DEFAULT_PARTIAL_BUCKETS_VISIBLE = false;
export declare const DEFAULT_CURRENT_TIME_MARKER_VISIBLE = false;
export declare const DEFAULT_DATA_LABELS_VISIBLE = false;
export declare const DEFAULT_POINTS_VISIBILITY: "auto";
export declare const DEFAULT_LINES_INTERPOLATION: "linear";
export declare const DEFAULT_BARS_MINIMUM_HEIGHT = 1;
export declare const DEFAULT_AREAS_FILL_OPACITY = 0.3;
export declare const DEFAULT_LINE_CATEGORICAL_COLOR_MAPPING: ColorMappingCategoricalType;
