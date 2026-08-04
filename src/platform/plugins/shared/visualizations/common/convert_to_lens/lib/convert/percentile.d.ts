import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { PercentileParams } from '../..';
import type { PercentileColumn, CommonColumnConverterArgs } from './types';
export declare const convertToPercentileParams: (percentile: number) => PercentileParams;
export declare const convertToPercentileColumn: ({ visType, agg, dataView, }: CommonColumnConverterArgs<METRIC_TYPES.PERCENTILES | METRIC_TYPES.SINGLE_PERCENTILE>, { index, reducedTimeRange }?: {
    index?: number;
    reducedTimeRange?: string;
}) => PercentileColumn | null;
