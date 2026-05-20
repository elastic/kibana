import type { BUCKET_TYPES, METRIC_TYPES } from '@kbn/data-plugin/common';
import type { Operation } from '../../types';
import type { Operations } from '../../constants';
interface Agg {
    isFormula?: false;
}
interface AggWithFormula {
    isFormula: true;
    formula: string;
}
type SupportedDataTypes = {
    [key: string]: readonly string[];
} & {
    default: readonly string[];
};
export type AggOptions<T> = {
    isFullReference: boolean;
    isFieldRequired: boolean;
    supportedDataTypes: SupportedDataTypes;
} & (T extends Exclude<Operation, 'formula'> ? Agg : AggWithFormula);
export type Metric<T extends Operation | string> = {
    name: T;
} & AggOptions<T>;
interface LocalSupportedMetrics {
    [METRIC_TYPES.AVG]: Metric<typeof Operations.AVERAGE>;
    [METRIC_TYPES.CARDINALITY]: Metric<typeof Operations.UNIQUE_COUNT>;
    [METRIC_TYPES.MEDIAN]: Metric<typeof Operations.MEDIAN>;
    [METRIC_TYPES.COUNT]: Metric<typeof Operations.COUNT>;
    [METRIC_TYPES.DERIVATIVE]: Metric<typeof Operations.DIFFERENCES>;
    [METRIC_TYPES.CUMULATIVE_SUM]: Metric<typeof Operations.CUMULATIVE_SUM>;
    [METRIC_TYPES.AVG_BUCKET]: Metric<typeof Operations.FORMULA>;
    [METRIC_TYPES.MAX_BUCKET]: Metric<typeof Operations.FORMULA>;
    [METRIC_TYPES.MIN_BUCKET]: Metric<typeof Operations.FORMULA>;
    [METRIC_TYPES.SUM_BUCKET]: Metric<typeof Operations.FORMULA>;
    [METRIC_TYPES.MAX]: Metric<typeof Operations.MAX>;
    [METRIC_TYPES.MIN]: Metric<typeof Operations.MIN>;
    [METRIC_TYPES.SUM]: Metric<typeof Operations.SUM>;
    [METRIC_TYPES.VALUE_COUNT]: Metric<typeof Operations.COUNT>;
    [METRIC_TYPES.STD_DEV]: Metric<typeof Operations.STANDARD_DEVIATION>;
    [METRIC_TYPES.PERCENTILES]: Metric<typeof Operations.PERCENTILE>;
    [METRIC_TYPES.SINGLE_PERCENTILE]: Metric<typeof Operations.PERCENTILE>;
    [METRIC_TYPES.PERCENTILE_RANKS]: Metric<typeof Operations.PERCENTILE_RANK>;
    [METRIC_TYPES.SINGLE_PERCENTILE_RANK]: Metric<typeof Operations.PERCENTILE_RANK>;
    [METRIC_TYPES.TOP_HITS]: Metric<typeof Operations.LAST_VALUE>;
    [METRIC_TYPES.TOP_METRICS]: Metric<typeof Operations.LAST_VALUE>;
    [METRIC_TYPES.MOVING_FN]: Metric<typeof Operations.MOVING_AVERAGE>;
}
type UnsupportedSupportedMetrics = Exclude<METRIC_TYPES | BUCKET_TYPES, keyof LocalSupportedMetrics>;
export type SupportedMetrics = LocalSupportedMetrics & {
    [Key in UnsupportedSupportedMetrics]?: null;
};
export declare const SUPPORTED_METRICS: SupportedMetrics;
type SupportedMetricsKeys = keyof LocalSupportedMetrics;
export type SupportedMetric = (typeof SUPPORTED_METRICS)[SupportedMetricsKeys];
export declare const getFormulaFromMetric: (metric: SupportedMetric) => string;
export {};
