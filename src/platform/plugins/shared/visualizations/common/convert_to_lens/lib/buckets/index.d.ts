import type { IAggConfig, METRIC_TYPES } from '@kbn/data-plugin/common';
import { BUCKET_TYPES } from '@kbn/data-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SchemaConfig } from '../../..';
import type { CommonBucketConverterArgs } from '../convert';
import type { AnyBucketColumnWithMeta, AnyMetricColumnWithSourceFieldWithMeta } from '../../types';
export type BucketAggs = BUCKET_TYPES.TERMS | BUCKET_TYPES.SIGNIFICANT_TERMS | BUCKET_TYPES.DATE_HISTOGRAM | BUCKET_TYPES.FILTERS | BUCKET_TYPES.RANGE | BUCKET_TYPES.HISTOGRAM;
export declare const getBucketColumns: ({ agg, dataView, metricColumns, aggs, visType }: CommonBucketConverterArgs<BucketAggs>, { label, isSplit, dropEmptyRowsInDateHistogram, }: {
    label: string;
    isSplit: boolean;
    dropEmptyRowsInDateHistogram: boolean;
}) => import("../convert").DateHistogramColumn | import("../convert").TermsColumn | import("../convert").FiltersColumn | import("../convert").RangeColumn | null;
export declare const convertBucketToColumns: ({ agg, dataView, metricColumns, aggs, visType, }: {
    visType: string;
    agg: SchemaConfig | IAggConfig;
    dataView: DataView;
    metricColumns: AnyMetricColumnWithSourceFieldWithMeta[];
    aggs: Array<SchemaConfig<METRIC_TYPES>>;
}, isSplit?: boolean, dropEmptyRowsInDateHistogram?: boolean) => AnyBucketColumnWithMeta | null;
