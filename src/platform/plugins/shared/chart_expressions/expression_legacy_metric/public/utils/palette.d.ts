import type { Datatable } from '@kbn/expressions-plugin/common';
/**
 * Coloring domain for the legacy metric. This is the single source of truth shared by the editor
 *  and the render-time coloring so the two can never diverge:
 *  - a single value is centered at 0: `[0, 2 * value]` (or `[2 * value, 0]` for negatives), matching
 *    the metric chart's single-value behavior.
 *  - a single `0` has no meaningful range, so we fall back to a fixed `[-50, 100]` domain that keeps
 *    the palette visible instead of collapsing to `[0, 0]`.
 *  - multiple rows span the actual min/max of the values, so every tile is colored relative to the others
 */
export declare const getLegacyMetricDataBounds: (metricId?: string, data?: Datatable) => {
    min: number;
    max: number;
};
export declare const parseRgbString: (rgb: string) => {
    red: number;
    green: number;
    blue: number;
    opacity: number | undefined;
} | null;
export declare const shouldApplyColor: (color: string) => boolean;
export declare const needsLightText: (bgColor?: string) => boolean;
