import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { PercentageModeConfig, AnyMetricColumnAndMeta } from '../../types';
import type { ExtendedColumnConverterArgs } from '../convert';
export declare const convertMetricToColumns: ({ agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<METRIC_TYPES>, percentageModeConfig?: PercentageModeConfig) => AnyMetricColumnAndMeta[] | null;
