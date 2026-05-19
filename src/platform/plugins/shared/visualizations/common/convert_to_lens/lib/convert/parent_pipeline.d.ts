import { METRIC_TYPES } from '@kbn/data-plugin/common';
import type { SchemaConfig } from '../../..';
import type { AnyMetricColumnAndMeta, MovingAverageParams } from '../../types';
import type { MovingAverageColumn, DerivativeColumn, CumulativeSumColumn, FormulaColumn, ExtendedColumnConverterArgs, OtherParentPipelineAggs } from './types';
export type ParentPipelineAggColumn = MovingAverageColumn | DerivativeColumn | CumulativeSumColumn;
export declare const convertToMovingAverageParams: (agg: SchemaConfig<METRIC_TYPES.MOVING_FN>) => MovingAverageParams;
export declare const convertToOtherParentPipelineAggColumns: ({ agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<OtherParentPipelineAggs>, reducedTimeRange?: string) => FormulaColumn | [ParentPipelineAggColumn, AnyMetricColumnAndMeta] | null;
export declare const convertToCumulativeSumAggColumn: ({ agg, dataView, aggs, visType }: ExtendedColumnConverterArgs<METRIC_TYPES.CUMULATIVE_SUM>, reducedTimeRange?: string) => FormulaColumn | [ParentPipelineAggColumn, AnyMetricColumnAndMeta] | null;
