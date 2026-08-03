import { FunctionNames } from '@kbn/esql-language';
import type { SerializableRecord } from '@kbn/utility-types';
/**
 * Derived from `@kbn/esql-language`'s `FunctionNames` enum (rather than a
 * hand-rolled string union) so this type tracks the canonical ES|QL function
 * names. Using a template-literal type (instead of the enum members
 * themselves) keeps the resulting type a plain string literal union --
 * assignable from either `FunctionNames.AVG` or the literal `'avg'` -- since
 * TypeScript string enums are otherwise nominally typed.
 */
export type SimpleAggregation = `${FunctionNames.AVG}` | `${FunctionNames.SUM}` | `${FunctionNames.MIN}` | `${FunctionNames.MAX}`;
/**
 * Which percentile bucket to use when the metric's aggregation is
 * `PERCENTILE(field, N)`. There is no per-percentile ES|QL function name to
 * derive this from (only `FunctionNames.PERCENTILE` itself, which names the
 * function, not the requested percentile), so these remain their own
 * literal union; the function name itself is sourced from `FunctionNames`
 * wherever it's used to build the aggregation expression.
 */
export type HistogramPercentile = 'p50' | 'p75' | 'p90' | 'p95' | 'p99';
export interface MetricsGridSettings extends SerializableRecord {
    counterAggregation: SimpleAggregation;
    gaugeAggregation: SimpleAggregation;
    histogramPercentile: HistogramPercentile;
}
export declare const METRICS_GRID_SETTINGS_DEFAULTS: MetricsGridSettings;
