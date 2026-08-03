import type { EuiSuperSelectOption } from '@elastic/eui';
import type { HistogramPercentile, SimpleAggregation } from '@kbn/discover-utils';
/**
 * Display labels for `SimpleAggregation` values. Spelled out in full (e.g.
 * "Average" rather than "AVG") for readability -- the underlying value
 * remains the short ES|QL function name used to build the aggregation
 * expression.
 */
export declare const SIMPLE_AGGREGATION_LABELS: Record<SimpleAggregation, string>;
/** Display labels for `HistogramPercentile` values, e.g. "50th percentile". */
export declare const HISTOGRAM_PERCENTILE_LABELS: Record<HistogramPercentile, string>;
export declare const buildSimpleAggregationOptions: (dataTestSubjPrefix: string) => Array<EuiSuperSelectOption<SimpleAggregation>>;
export declare const buildHistogramPercentileOptions: () => Array<EuiSuperSelectOption<HistogramPercentile>>;
export declare const COUNTER_OPTIONS: EuiSuperSelectOption<SimpleAggregation>[];
export declare const GAUGE_OPTIONS: EuiSuperSelectOption<SimpleAggregation>[];
export declare const HISTOGRAM_OPTIONS: EuiSuperSelectOption<HistogramPercentile>[];
