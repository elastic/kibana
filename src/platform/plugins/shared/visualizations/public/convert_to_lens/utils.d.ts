import type { DataView } from '@kbn/data-views-plugin/common';
import type { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/public';
import type { AnyMetricColumnWithSourceFieldWithMeta } from '../../common/convert_to_lens';
import type { AggBasedColumn, SchemaConfig, SupportedAggregation } from '../../common';
import type { BucketColumn } from '../../common/convert_to_lens/lib';
import type { Schemas } from '../vis_schemas';
export declare const isReferenced: (columnId: string, references: string[]) => boolean;
export declare const getColumnsWithoutReferenced: (columns: AggBasedColumn[]) => AggBasedColumn[];
export declare const getBucketCollapseFn: (metrics: Array<SchemaConfig<SupportedAggregation>>, customBucketColumns: AggBasedColumn[], customBucketsMap: Record<string, string>, metricColumns: AggBasedColumn[]) => Record<"min" | "max" | "avg" | "sum", string[]>;
export declare const getBucketColumns: (visType: string, visSchemas: Schemas, keys: Array<keyof Schemas>, dataView: DataView, isSplit: boolean, metricColumns: AnyMetricColumnWithSourceFieldWithMeta[], dropEmptyRowsInDateHistogram?: boolean) => AggBasedColumn[] | null;
export declare const isValidVis: (visSchemas: Schemas, supportMixedSiblingPipelineAggs?: boolean) => boolean;
export declare const getMetricsWithoutDuplicates: (metrics: Array<SchemaConfig<SupportedAggregation>>) => SchemaConfig<SupportedAggregation>[];
export declare const sortColumns: (columns: AggBasedColumn[], visSchemas: Schemas, bucketsAndSplitsKeys: Array<keyof Schemas>, metricsWithoutDuplicates: Array<SchemaConfig<SupportedAggregation>>) => AggBasedColumn[];
export declare const getColumnIds: (columns: AggBasedColumn[]) => string[];
export declare const getCustomBucketColumns: (visType: string, customBucketsWithMetricIds: Array<{
    customBucket: IAggConfig;
    metricIds: string[];
}>, metricColumns: AnyMetricColumnWithSourceFieldWithMeta[], dataView: DataView, aggs: Array<SchemaConfig<METRIC_TYPES>>, dropEmptyRowsInDateHistogram?: boolean) => {
    customBucketColumns: (BucketColumn | null)[];
    customBucketsMap: Record<string, string>;
};
