import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { CommonColumnConverterArgs, LastValueColumn } from './types';
export declare const convertToLastValueColumn: ({ visType, agg, dataView, }: CommonColumnConverterArgs<METRIC_TYPES.TOP_HITS | METRIC_TYPES.TOP_METRICS>, reducedTimeRange?: string) => LastValueColumn | null;
