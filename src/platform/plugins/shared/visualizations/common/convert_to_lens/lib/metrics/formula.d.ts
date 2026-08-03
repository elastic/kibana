import type { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { ExtendedColumnConverterArgs } from '../convert';
export declare const addTimeRangeToFormula: (reducedTimeRange?: string) => string;
export declare const getFormulaForPipelineAgg: ({ agg, dataView, aggs, visType, }: ExtendedColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM | METRIC_TYPES.DERIVATIVE | METRIC_TYPES.MOVING_FN | METRIC_TYPES.AVG_BUCKET | METRIC_TYPES.MAX_BUCKET | METRIC_TYPES.MIN_BUCKET | METRIC_TYPES.SUM_BUCKET>) => string | null;
export declare const getFormulaForAgg: ({ agg, aggs, dataView, visType, }: ExtendedColumnConverterArgs<METRIC_TYPES>) => string | null;
