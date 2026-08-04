import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { PercentileRanksParams } from '../..';
import type { PercentileRanksColumn, CommonColumnConverterArgs } from './types';
export declare const convertToPercentileRankParams: (value: number) => PercentileRanksParams;
export declare const convertToPercentileRankColumn: ({ visType, agg, dataView, }: CommonColumnConverterArgs<METRIC_TYPES.SINGLE_PERCENTILE_RANK | METRIC_TYPES.PERCENTILE_RANKS>, { index, reducedTimeRange }?: {
    index?: number;
    reducedTimeRange?: string;
}) => PercentileRanksColumn | null;
