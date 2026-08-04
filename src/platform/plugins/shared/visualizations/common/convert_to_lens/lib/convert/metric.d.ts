import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { SupportedMetric } from './supported_metrics';
import type { CommonColumnConverterArgs, MetricsWithField } from './types';
import type { SchemaConfig } from '../../../types';
import type { AvgColumn, CardinalityColumn, CountColumn, MaxColumn, MedianColumn, MinColumn, SumColumn } from './types';
export type MetricAggregationColumnWithoutSpecialParams = AvgColumn | CountColumn | CardinalityColumn | MaxColumn | MedianColumn | MinColumn | SumColumn;
export type MetricsWithoutSpecialParams = METRIC_TYPES.AVG | METRIC_TYPES.COUNT | METRIC_TYPES.MAX | METRIC_TYPES.MIN | METRIC_TYPES.SUM | METRIC_TYPES.MEDIAN | METRIC_TYPES.CARDINALITY | METRIC_TYPES.VALUE_COUNT;
export declare const isMetricWithField: (agg: CommonColumnConverterArgs<METRIC_TYPES>["agg"]) => agg is SchemaConfig<MetricsWithField>;
export declare const convertMetricAggregationColumnWithoutSpecialParams: (aggregation: SupportedMetric, { visType, agg, dataView }: CommonColumnConverterArgs<MetricsWithoutSpecialParams>, reducedTimeRange?: string) => MetricAggregationColumnWithoutSpecialParams | null;
